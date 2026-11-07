// ============================================================
// FRAME PLAYER & SPRITE SHEET STREAMING ENGINE (HIGH PERFORMANCE)
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

export class FrameSheets {
  framesBase: string;
  manifest: FrameManifest;
  variant: 'mobile' | 'desktop';
  info: ManifestVariant;
  perSheet: number;
  prefetchAhead: number;
  historyBehind: number;
  maxCache: number;

  cache = new Map<number, ImageBitmap | HTMLImageElement>();
  loading = new Map<number, AbortController>();
  failures = new Map<number, number>();
  wanted: number[] = [];
  currentSheet = 0;
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

    const isMobile = variant === 'mobile';
    // Generous lookahead buffer: ~8 to 11 seconds of smooth, uninterrupted playback ahead
    this.prefetchAhead = isMobile ? 24 : 32;
    // Retain past sheets for instantaneous rewinding / scrubbing
    this.historyBehind = isMobile ? 12 : 16;
    // Bounded LRU cache size (high capacity for smooth streaming without stalls)
    this.maxCache = isMobile ? 64 : 96;

    this.onLoad = onLoad;
    this.onError = onError;
  }

  sheetUrl(index: number): string {
    return `${this.framesBase}/${this.variant}/${String(index).padStart(3, '0')}.webp`;
  }

  bootstrap() {
    // Prime the first 8 sheets immediately for zero-wait playback
    const initialWanted: number[] = [];
    for (let i = 0; i < Math.min(8, this.info.sheets); i++) {
      initialWanted.push(i);
    }
    this.wanted = initialWanted;
    this.pump();
  }

  focus(sheet: number, direction: number = 1) {
    this.currentSheet = sheet;
    const dir = direction >= 0 ? 1 : -1;
    const wanted: number[] = [];

    // 1. Immediate current and next sheets (highest priority)
    wanted.push(sheet);
    const stepAhead = dir === 1 ? this.prefetchAhead : Math.max(4, this.historyBehind);
    const stepBehind = dir === 1 ? this.historyBehind : this.prefetchAhead;

    for (let i = 1; i <= stepAhead; i++) {
      const idx = sheet + i * dir;
      if (idx >= 0 && idx < this.info.sheets) wanted.push(idx);
    }

    // 2. Buffer behind for instant scrub-back
    for (let i = 1; i <= stepBehind; i++) {
      const idx = sheet - i * dir;
      if (idx >= 0 && idx < this.info.sheets && !wanted.includes(idx)) {
        wanted.push(idx);
      }
    }

    this.wanted = wanted;
    this.pruneCache();
    this.pump();
  }

  pruneCache() {
    // Only prune if cache exceeds limit
    if (this.cache.size <= this.maxCache) return;

    // Evict sheets that are furthest from current position
    const sortedEntries = Array.from(this.cache.keys()).sort(
      (a, b) => Math.abs(b - this.currentSheet) - Math.abs(a - this.currentSheet)
    );

    while (this.cache.size > this.maxCache && sortedEntries.length > 0) {
      const furthest = sortedEntries.shift();
      if (furthest === undefined) break;

      // Keep within safety window
      if (Math.abs(furthest - this.currentSheet) <= 6) break;

      const bitmap = this.cache.get(furthest);
      if (bitmap && 'close' in bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
      this.cache.delete(furthest);
    }

    // Only abort network requests that are completely out of range (> 16 sheets away)
    for (const [index, controller] of this.loading) {
      if (Math.abs(index - this.currentSheet) > 16) {
        controller.abort();
        this.loading.delete(index);
      }
    }
  }

  maxConcurrent(): number {
    return this.variant === 'mobile' ? 4 : 6;
  }

  pump() {
    if (this.closed) return;

    for (const index of this.wanted) {
      if (this.loading.size >= this.maxConcurrent()) break;
      if (
        this.cache.has(index) ||
        this.loading.has(index) ||
        (this.failures.get(index) ?? 0) >= 3
      ) {
        continue;
      }

      const controller = new AbortController();
      this.loading.set(index, controller);
      this.load(index, controller);
    }
  }

  async load(index: number, controller: AbortController) {
    let bitmap: ImageBitmap | HTMLImageElement;
    try {
      const response = await fetch(this.sheetUrl(index), {
        signal: controller.signal,
        cache: 'force-cache',
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

      if (this.closed || controller.signal.aborted) {
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
  loop?: boolean;
  onFrame?: (time: number) => void;
  onReady?: () => void;
  onError?: (err: unknown) => void;
  onProgress?: (ratio: number, label: string) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onEnd?: () => void;
}

export class FramePlayer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  framesBase: string;
  poster?: HTMLImageElement;
  loop = false;
  onFrame?: (time: number) => void;
  onReady?: () => void;
  onError?: (err: unknown) => void;
  onProgress?: (ratio: number, label: string) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onEnd?: () => void;

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
  playing = false;

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
    loop = false,
    onFrame,
    onReady,
    onError,
    onProgress,
    onPlayStateChange,
    onEnd,
  }: FramePlayerOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.context = ctx;
    this.framesBase = framesBase;
    this.loop = loop;
    this.onFrame = onFrame;
    this.onReady = onReady;
    this.onError = onError;
    this.onProgress = onProgress;
    this.onPlayStateChange = onPlayStateChange;
    this.onEnd = onEnd;

    const coarse =
      matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    this.coarse = coarse;
    this.rate = coarse ? 0.95 : 1.02;

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
      this.onProgress?.(0.1, 'Preparing your journey…');
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
      this.rate = isMobile ? 0.95 : 1.02;
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

      // Ultra-low latency startup: warm sheet 0 and stream ahead immediately
      this.onProgress?.(0.7, 'Opening invitation…');
      await this.warmSheet(0);
      this.warmSheet(1).catch(() => {});

      this.ready = true;
      this.onReady?.();
      this.onProgress?.(1, '');
      this.drawFrame(0, true);

      // Pre-buffer upcoming moments continuously
      this.store.focus(0, 1);
    } catch (err) {
      this.fail(err);
    }
  }

  async warmSheet(sheetIndex: number) {
    try {
      if (this.store.cache.has(sheetIndex)) return;
      const response = await fetch(this.store.sheetUrl(sheetIndex));
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
      this.store.cache.set(sheetIndex, bitmap);
    } catch (e) {
      console.warn(`Initial warm fallback sheet ${sheetIndex}:`, e);
    }
  }

  onSheet() {
    if (this.pendingJump !== null) {
      const index = Math.round(this.pendingJump * this.fps);
      if (this.drawFrame(index)) {
        this.time = this.pendingJump;
        this.pendingJump = null;
      }
    } else if (this.playing || this.direction) {
      this.wake();
    } else if (this.frame < 0) {
      this.drawFrame(0);
    }
  }

  applyContextSettings() {
    // Pure, high-performance Canvas 2D image scaling (no ctx.filter CPU overhead)
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    // Avoid redundant canvas resets if size didn't change
    if (w === this.width && h === this.height && this.canvas.width > 0) return;

    this.width = w;
    this.height = h;

    const nativeDpr = window.devicePixelRatio || 1;
    // Cap DPR at 1.75 on desktop / 2.0 on mobile to balance razor-sharp quality and ultra-low fill latency
    const maxDpr = this.coarse ? 2.0 : 1.75;
    const dpr = Math.min(nativeDpr, maxDpr);

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
    this.playing = false;
    if (!this.store) return;
    const clamped = Math.max(0, Math.min(this.end, targetTime));
    const sheet = Math.floor((clamped * this.fps) / this.perSheet);
    this.pendingJump = clamped;
    const index = Math.round(clamped * this.fps);
    this.store.focus(sheet, 1);
    if (this.drawFrame(index)) {
      this.time = clamped;
      this.pendingJump = null;
    }
  }

  play(speed = 1.0) {
    if (!this.ready || this.closed) return;
    this.playing = true;
    this.direction = 1;
    this.rate = (this.coarse ? 0.95 : 1.02) * speed;
    this.boost = 1;
    this.lastTick = 0;
    this.onPlayStateChange?.(true);
    this.wake();
  }

  pause() {
    this.playing = false;
    this.onPlayStateChange?.(false);
    this.stop();
  }

  intent(direction: number, grace = 450) {
    if (!this.ready || this.closed) return;
    this.playing = false; // User gesture takes immediate priority
    const sheet = Math.floor((this.time * this.fps) / this.perSheet);
    if (this.direction !== direction) this.lastTick = 0;
    const now = performance.now();
    if (now - this.lastIntent < 100) {
      this.boost = Math.min(1.3, this.boost + 0.08);
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
    if (!this.raf && (this.playing || this.direction) && !document.hidden && !this.closed) {
      this.raf = requestAnimationFrame((now) => this.tick(now));
    }
  }

  tick(now: number) {
    this.raf = 0;
    if (this.closed || document.hidden) {
      this.stop();
      return;
    }

    const isAutoPlay = this.playing;
    const isIntent = !isAutoPlay && this.direction !== 0 && now < this.until;

    if (!isAutoPlay && !isIntent) {
      this.stop();
      return;
    }

    const dt = this.lastTick ? Math.min((now - this.lastTick) / 1000, 0.05) : 0;
    this.lastTick = now;

    const dir = isAutoPlay ? 1 : this.direction;
    const speedMultiplier = isAutoPlay ? 1 : this.boost;
    const next = Math.max(
      0,
      Math.min(
        this.end,
        this.time + dir * this.rate * speedMultiplier * dt
      )
    );

    const index = Math.round(next * this.fps);
    const sheet = Math.floor(index / this.perSheet);
    this.store.focus(sheet, dir);

    if (this.drawFrame(index)) {
      this.time = next;
    }

    const atBoundary =
      (dir < 0 && next <= 0) ||
      (dir > 0 && next >= this.end);

    if (atBoundary) {
      if (isAutoPlay) {
        if (dir > 0 && this.loop) {
          this.time = 0;
          this.drawFrame(0, true);
          this.wake();
          return;
        }
        this.playing = false;
        this.onPlayStateChange?.(false);
        this.onEnd?.();
      }
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
    this.playing = false;
    this.onError?.(error);
  }

  dispose() {
    this.stop();
    this.playing = false;
    this.closed = true;
    this.store?.dispose();
  }
}


