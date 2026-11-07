// ============================================================
// FRAME PLAYER & SPRITE SHEET STREAMING ENGINE
// ============================================================

export interface ManifestVariant {
  width: number;
  height: number;
  count: number;
  sheets: number;
}

export interface FrameManifest {
  fps: number;
  columns: number;
  rows: number;
  variants: {
    mobile: ManifestVariant;
    desktop: ManifestVariant;
  };
}

const PREFETCH_FRAMES = 24; // Stream ahead smoothly without excessive memory usage
const WARM_SHEETS = 1;      // Instant start: preload only initial frame sheet (< 400KB)
const WARM_CONCURRENCY = 2;

export class FrameSheets {
  framesBase: string;
  manifest: FrameManifest;
  variant: 'mobile' | 'desktop';
  info: ManifestVariant;
  perSheet: number;
  prefetchSheets: number;
  cache = new Map<number, ImageBitmap | HTMLImageElement>();
  loading = new Map<number, AbortController>();
  failures = new Map<number, number>();
  wanted: number[] = [];
  bootstrapEnd = 0;
  onLoad: () => void;
  onError: (err: unknown) => void;
  closed = false;

  constructor(
    manifest: FrameManifest,
    variant: 'mobile' | 'desktop',
    framesBase: string,
    onLoad: () => void,
    onError: (err: unknown) => void
  ) {
    this.framesBase = framesBase;
    this.manifest = manifest;
    this.variant = variant;
    this.info = manifest.variants[variant];
    this.perSheet = manifest.columns * manifest.rows;
    this.prefetchSheets = Math.min(
      this.info.sheets,
      Math.ceil(PREFETCH_FRAMES / this.perSheet)
    );
    this.onLoad = onLoad;
    this.onError = onError;
  }

  sheetUrl(index: number): string {
    return `${this.framesBase}/${this.variant}/${String(index).padStart(3, '0')}.webp`;
  }

  bootstrap() {
    this.bootstrapEnd = this.prefetchSheets;
    this.pump();
  }

  clearBootstrap(atSheet: number) {
    if (atSheet >= this.bootstrapEnd - 1) this.bootstrapEnd = 0;
  }

  keepInCache(index: number): boolean {
    return this.wanted.includes(index) || index < this.bootstrapEnd;
  }

  focus(sheet: number, direction: number = 1) {
    const dir = direction || 1;
    const wanted: number[] = [];
    const behind = sheet - dir;
    if (behind >= 0 && behind < this.info.sheets) wanted.push(behind);
    for (let i = 0; i <= this.prefetchSheets; i++) {
      const idx = sheet + i * dir;
      if (idx >= 0 && idx < this.info.sheets) wanted.push(idx);
    }
    if (wanted.join() === this.wanted.join()) return;
    this.wanted = wanted;

    // Prune unneeded bitmaps to preserve mobile RAM
    for (const [index, bitmap] of this.cache) {
      if (!this.keepInCache(index)) {
        if ('close' in bitmap && typeof bitmap.close === 'function') {
          bitmap.close();
        }
        this.cache.delete(index);
      }
    }
    for (const [index, request] of this.loading) {
      if (!this.keepInCache(index)) request.abort();
    }
    this.pump();
  }

  maxConcurrent(): number {
    return this.variant === 'mobile' ? 4 : 8;
  }

  pump() {
    if (this.closed) return;
    const queue = [...new Set([...this.wanted, ...this.bootstrapIndices()])];
    for (const index of queue) {
      if (this.loading.size >= this.maxConcurrent()) break;
      if (
        this.cache.has(index) ||
        this.loading.has(index) ||
        (this.failures.get(index) ?? 0) >= 3
      )
        continue;
      const controller = new AbortController();
      this.loading.set(index, controller);
      this.load(index, controller);
    }
  }

  bootstrapIndices(): number[] {
    if (!this.bootstrapEnd) return [];
    return Array.from({ length: this.bootstrapEnd }, (_, index) => index);
  }

  async load(index: number, controller: AbortController) {
    let bitmap: ImageBitmap | HTMLImageElement;
    try {
      const response = await fetch(this.sheetUrl(index), {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Frame sheet ${response.status}`);
      const blob = await response.blob();
      if ('createImageBitmap' in window) {
        bitmap = await createImageBitmap(blob);
      } else {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.src = url;
        await image.decode();
        URL.revokeObjectURL(url);
        bitmap = image;
      }
      if (this.closed || controller.signal.aborted || !this.keepInCache(index)) {
        if ('close' in bitmap && typeof bitmap.close === 'function') {
          bitmap.close();
        }
      } else {
        this.cache.set(index, bitmap);
        this.onLoad();
      }
    } catch (error) {
      if (!controller.signal.aborted && !this.closed) {
        const count = (this.failures.get(index) || 0) + 1;
        this.failures.set(index, count);
        if (count >= 3) this.onError(error);
      }
    } finally {
      this.loading.delete(index);
      this.pump();
    }
  }

  dispose() {
    this.closed = true;
    for (const request of this.loading.values()) request.abort();
    for (const bitmap of this.cache.values()) {
      if ('close' in bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
    }
    this.cache.clear();
  }
}

export interface FramePlayerOptions {
  canvas: HTMLCanvasElement;
  framesBase?: string;
  poster?: string;
  onFrame?: (time: number) => void;
  onReady?: () => void;
  onError?: (err: unknown) => void;
  onProgress?: (ratio: number, label: string) => void;
}

export class FramePlayer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  framesBase: string;
  poster?: HTMLImageElement;
  onFrame?: (time: number) => void;
  onReady?: () => void;
  onError?: (err: unknown) => void;
  onProgress?: (ratio: number, label: string) => void;

  time = 0;
  direction = 0;
  coarse = false;
  rate = 1.0;
  boost = 1;
  lastIntent = 0;
  frame = -1;
  raf = 0;
  until = 0;
  lastTick = 0;
  pendingJump: number | null = null;
  ready = false;
  closed = false;

  fps = 24;
  perSheet = 8;
  columns = 4;
  variant: 'mobile' | 'desktop' = 'mobile';
  info!: ManifestVariant;
  end = 50.416667;
  store!: FrameSheets;

  width = 0;
  height = 0;
  drawWidth = 0;
  drawHeight = 0;

  constructor({
    canvas,
    framesBase = '/frames',
    poster = '/poster.jpg',
    onFrame,
    onReady,
    onError,
    onProgress,
  }: FramePlayerOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.context = ctx;
    this.framesBase = framesBase;
    this.onFrame = onFrame;
    this.onReady = onReady;
    this.onError = onError;
    this.onProgress = onProgress;

    const coarse =
      matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    this.coarse = coarse;
    this.rate = coarse ? 0.95 : 1.05; // Majestic, slow, cinematic pace

    if (poster) {
      this.poster = new Image();
      this.poster.src = poster;
      this.poster.onload = () => {
        if (this.frame < 0) this.drawPoster();
      };
    }
    this.resize();
  }

  async load() {
    try {
      this.onProgress?.(0, 'Preparing your journey…');
      const response = await fetch('/manifest.json');
      if (!response.ok) throw new Error('Frame manifest unavailable');
      const manifest: FrameManifest = await response.json();
      if (this.closed) return;

      this.fps = manifest.fps;
      this.perSheet = manifest.columns * manifest.rows;
      this.columns = manifest.columns;

      const isMobile =
        matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
      this.variant = isMobile ? 'mobile' : 'desktop';
      this.coarse = isMobile;
      this.rate = isMobile ? 0.95 : 1.05;
      this.info = manifest.variants[this.variant];
      this.end = (this.info.count - 1) / this.fps;

      this.store = new FrameSheets(
        manifest,
        this.variant,
        this.framesBase,
        () => this.onSheet(),
        (err) => this.fail(err)
      );

      this.resize();
      this.store.bootstrap();

      // Instant startup: warm only the initial moment (< 100ms)
      this.onProgress?.(0.6, 'Preparing your journey…');
      await this.warmInitial();

      this.ready = true;
      this.onReady?.();
      this.onProgress?.(1, '');
      this.drawFrame(0, true);

      // Silently pre-buffer upcoming moments in background without blocking UI
      this.store.focus(0, 1);
    } catch (err) {
      this.fail(err);
    }
  }

  async warmInitial() {
    try {
      const response = await fetch(this.store.sheetUrl(0));
      if (!response.ok) throw new Error(`Initial ${response.status}`);
      const blob = await response.blob();
      let bitmap: ImageBitmap | HTMLImageElement;
      if ('createImageBitmap' in window) {
        bitmap = await createImageBitmap(blob);
      } else {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.src = url;
        await image.decode();
        URL.revokeObjectURL(url);
        bitmap = image;
      }
      this.store.cache.set(0, bitmap);
    } catch (e) {
      console.warn('Initial warm fallback:', e);
    }
  }

  onSheet() {
    if (this.pendingJump !== null) {
      const index = Math.round(this.pendingJump * this.fps);
      if (this.drawFrame(index)) {
        this.time = this.pendingJump;
        this.pendingJump = null;
      }
    } else if (this.direction) {
      this.wake();
    } else if (this.frame < 0) {
      this.drawFrame(0);
    }
  }

  applyContextSettings() {
    // Always use high-quality smoothing for best upscale quality
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    // Canvas 2D filter sharpening: contrast + saturation boost compensates for
    // perceived softness when sprite-sheet frames are upscaled to fill the viewport
    if ('filter' in this.context) {
      (this.context as CanvasRenderingContext2D & { filter: string }).filter =
        'contrast(1.1) saturate(1.08) brightness(1.01)';
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const nativeDpr = window.devicePixelRatio || 1;
    // Use full native DPR for crisp rendering on all displays (Retina = 2x, standard = 1x)
    // Cap at 3 to avoid excessive GPU memory on extreme DPR devices
    const dpr = Math.min(nativeDpr, 3);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.scale(dpr, dpr);
    this.drawWidth = this.width;
    this.drawHeight = this.height;
    this.applyContextSettings();
    if (this.frame >= 0 && this.store) {
      this.drawFrame(this.frame, true);
    } else {
      this.drawPoster();
    }
  }

  drawPoster() {
    if (!this.poster?.complete || !this.poster.naturalWidth) return;
    this.drawImage(
      this.poster,
      0,
      0,
      this.poster.naturalWidth,
      this.poster.naturalHeight
    );
  }

  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    width: number,
    height: number
  ) {
    const scale = Math.max(this.drawWidth / width, this.drawHeight / height);
    const dw = width * scale;
    const dh = height * scale;
    const dx = (this.drawWidth - dw) / 2;
    const dy = (this.drawHeight - dh) / 2;
    this.context.drawImage(
      image,
      sx,
      sy,
      width,
      height,
      Math.round(dx),
      Math.round(dy),
      Math.round(dw),
      Math.round(dh)
    );
  }

  drawFrame(index: number, force = false): boolean {
    if (!force && index === this.frame) return true;
    const sheet = Math.floor(index / this.perSheet);
    const bitmap = this.store?.cache.get(sheet);
    if (!bitmap) return false;
    const cell = index % this.perSheet;
    this.drawImage(
      bitmap,
      (cell % this.columns) * this.info.width,
      Math.floor(cell / this.columns) * this.info.height,
      this.info.width,
      this.info.height
    );
    this.frame = index;
    this.time = index / this.fps;
    this.onFrame?.(this.time);
    return true;
  }

  seek(targetTime: number) {
    this.stop();
    if (!this.store) return;
    const clamped = Math.max(0, Math.min(this.end, targetTime));
    const sheet = Math.floor((clamped * this.fps) / this.perSheet);
    this.store.clearBootstrap(sheet);
    this.pendingJump = clamped;
    const index = Math.round(clamped * this.fps);
    this.store.focus(sheet, 1);
    if (this.drawFrame(index)) {
      this.time = clamped;
      this.pendingJump = null;
    }
  }

  intent(direction: number, grace = 550) {
    if (!this.ready || this.closed) return;
    const sheet = Math.floor((this.time * this.fps) / this.perSheet);
    this.store?.clearBootstrap(sheet);
    if (this.direction !== direction) this.lastTick = 0;
    const now = performance.now();
    if (now - this.lastIntent < 90) {
      this.boost = Math.min(1.25, this.boost + 0.1);
    } else {
      this.boost = 1;
    }
    this.lastIntent = now;
    this.direction = direction;
    this.until = performance.now() + grace;
    this.store.focus(sheet, direction);
    this.wake();
  }

  wake() {
    if (!this.raf && this.direction && !document.hidden && !this.closed) {
      this.raf = requestAnimationFrame((now) => this.tick(now));
    }
  }

  tick(now: number) {
    this.raf = 0;
    if (!this.direction || document.hidden || now >= this.until) {
      this.stop();
      return;
    }
    const dt = this.lastTick ? Math.min((now - this.lastTick) / 1000, 0.06) : 0;
    this.lastTick = now;
    const next = Math.max(
      0,
      Math.min(
        this.end,
        this.time + this.direction * this.rate * this.boost * dt
      )
    );
    const index = Math.round(next * this.fps);
    this.store.focus(Math.floor(index / this.perSheet), this.direction);
    if (this.drawFrame(index)) {
      this.time = next;
    }
    const atBoundary =
      (this.direction < 0 && next === 0) ||
      (this.direction > 0 && next === this.end);
    if (atBoundary && index === this.frame) {
      this.stop();
    } else {
      this.wake();
    }
  }

  stop() {
    this.direction = 0;
    this.until = 0;
    this.lastTick = 0;
    this.boost = 1;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  fail(error: unknown) {
    if (this.closed) return;
    this.stop();
    this.onError?.(error);
  }

  dispose() {
    this.stop();
    this.closed = true;
    this.store?.dispose();
  }
}

