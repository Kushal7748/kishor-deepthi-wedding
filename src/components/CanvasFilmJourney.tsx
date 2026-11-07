import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FramePlayer } from '../lib/framePlayer';
import { config } from '../data/invitation.config';

const STARTS = [0, 7.0, 15.5, 26.5, 37.0, 44.0];
const CHAPTER_NAMES = [
  'The beginning',
  'The blessing',
  'The light',
  'The gathering',
  'The horizon',
  'The promise',
];
const CHAPTER_4K_IMAGES = [
  '/images/hero-gopuram.webp',
  '/images/temple-corridor.webp',
  '/images/pillared-mandapa.webp',
  '/images/stone-colonnade.webp',
  '/images/coastal-sea.webp',
  '/images/coastal-arch.webp',
];
const DURATION = 50.416667;
const FPS = 24;
const FRAME = 1 / FPS;

export const CanvasFilmJourney: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const journeyRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLSpanElement | null>(null);
  const loaderFillRef = useRef<HTMLSpanElement | null>(null);
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playerRef = useRef<FramePlayer | null>(null);
  const lastChapterRef = useRef<number>(-1);
  const autoHoldUntilRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Preparing your journey…');
  const [activeChapter, setActiveChapter] = useState(0);
  const [mediaStatus, setMediaStatus] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1. HERO DEPTH MOTION (subtle parallax — no clip-path)
  // ─────────────────────────────────────────────────────────────
  const updateHeroDepth = useCallback((time: number) => {
    const heroContent = heroContentRef.current;
    if (!heroContent) return;
    if (time >= STARTS[1]) return;

    // Subtle scale + lift as user scrolls into the film — no clip-path, no artifacts
    const depth = Math.min(Math.max(time / 5, 0), 1);
    heroContent.style.transform = `translateY(${-depth * 18}px) scale(${
      1 - depth * 0.06
    })`;
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. CHAPTER VISIBILITY & OPACITY TRANSITIONS
  // ─────────────────────────────────────────────────────────────
  const updateChapter = useCallback(
    (time: number) => {
      let idx = 0;
      for (let i = STARTS.length - 1; i >= 0; i--) {
        if (time >= STARTS[i]) {
          idx = i;
          break;
        }
      }

      setActiveChapter(idx);

      // When auto-scroll crosses into a new chapter, hold at details chapter only
      if (idx !== lastChapterRef.current) {
        lastChapterRef.current = idx;
        // Only pause on chapter 4 (The Gathering, idx=3) where event details are shown
        // All other chapters: 0ms hold — continuous cinematic scroll
        const holdMs = idx === 3 ? 2000 : 0;
        autoHoldUntilRef.current = performance.now() + holdMs;
        if (holdMs > 0) playerRef.current?.stop();
      }

      // Chapter opacity smooth fade
      const copies = document.querySelectorAll<HTMLElement>('.chapter-copy');
      copies.forEach((copy, i) => {
        const start = STARTS[i];
        const nextStart = STARTS[i + 1] ?? DURATION;

        const fadeIn = i === 0 ? 1 : Math.min(Math.max((time - start) / 0.65, 0), 1);
        const fadeOut =
          i === STARTS.length - 1
            ? 1
            : Math.min(Math.max((nextStart - time) / 0.65, 0), 1);

        const alpha = Math.min(fadeIn, fadeOut);
        const smoothAlpha = alpha * alpha * (3 - 2 * alpha);

        if (i === idx) {
          copy.classList.add('is-active');
          copy.style.opacity = String(smoothAlpha);
          copy.style.visibility = smoothAlpha > 0.01 ? 'visible' : 'hidden';
          copy.removeAttribute('aria-hidden');
          copy.inert = false;
        } else {
          copy.classList.remove('is-active');
          copy.style.opacity = '0';
          copy.style.visibility = 'hidden';
          copy.setAttribute('aria-hidden', 'true');
          copy.inert = true;
        }
      });

      // Update progress bar
      if (progressFillRef.current) {
        const progress = Math.min(
          Math.max(time / (DURATION - FRAME), 0),
          1
        );
        progressFillRef.current.style.transform = `scaleX(${progress})`;
      }

      // Update 3D skyline mask
      updateHeroDepth(time);
    },
    [updateHeroDepth]
  );

  // ─────────────────────────────────────────────────────────────
  // 3. INITIALIZE FRAME PLAYER
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    updateHeroDepth(0);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const player = new FramePlayer({
      canvas,
      framesBase: '/frames',
      poster: '/poster.jpg',
      onProgress(ratio, label) {
        const pct = Math.round(ratio * 100);
        setLoadPct(pct);
        setLoadLabel(label || 'Preparing your journey…');
        if (loaderFillRef.current) {
          loaderFillRef.current.style.transform = `scaleX(${ratio})`;
        }
      },
      onReady() {
        setLoading(false);
        setMediaStatus('');
        // Start background music right from the iconic "Kanmaniyee..." cue (48.7s)
        const KANMANIYE_CUE = 48.7;
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = KANMANIYE_CUE;
          audio.volume = 0.6;
          audio.play().catch(() => {
            // Autoplay blocked — music will start on first user interaction
            const startOnInteract = () => {
              if (audio.currentTime < 40) {
                audio.currentTime = KANMANIYE_CUE;
              }
              audio.play().catch(() => {});
              window.removeEventListener('wheel', startOnInteract);
              window.removeEventListener('touchstart', startOnInteract);
              window.removeEventListener('keydown', startOnInteract);
              window.removeEventListener('mousedown', startOnInteract);
            };
            window.addEventListener('wheel', startOnInteract, { once: true, passive: true });
            window.addEventListener('touchstart', startOnInteract, { once: true, passive: true });
            window.addEventListener('keydown', startOnInteract, { once: true, passive: true });
            window.addEventListener('mousedown', startOnInteract, { once: true, passive: true });
          });
        }
      },
      onFrame(time) {
        updateChapter(time);
        // Synchronize scrollbar position with the smoothly ticking film
        const journey = journeyRef.current;
        if (journey) {
          const scrollDistance = Math.max(1, journey.offsetHeight - window.innerHeight);
          const expectedScrollY = Math.round((time / (DURATION - FRAME)) * scrollDistance);
          if (Math.abs(window.scrollY - expectedScrollY) > 28) {
            isProgrammaticScrollRef.current = true;
            window.scrollTo({ top: expectedScrollY, behavior: 'instant' });
            requestAnimationFrame(() => {
              isProgrammaticScrollRef.current = false;
            });
          }
        }
      },
      onError(err) {
        console.warn('Player issue:', err);
        setMediaStatus('Loading next moments…');
      },
    });

    playerRef.current = player;
    player.load();

    const handleResize = () => {
      player.resize();
      updateHeroDepth(player.time);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      player.dispose();
    };
  }, [updateChapter, updateHeroDepth]);

  // ─────────────────────────────────────────────────────────────
  // 4. MOMENTUM INTENT & SCROLL CONTROLLERS (BUTTER-SMOOTH)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const journey = journeyRef.current;
    const stage = stageRef.current;
    if (!journey) return;

    // Wheel & Trackpad: drives smooth intent without jitter
    const onWheel = (e: WheelEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      playerRef.current?.intent(dir, 550);
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    // Touch: natural mobile gesture momentum
    let touchStartY = 0;
    let touchStartX = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.touches.length !== 1 || !playerRef.current?.ready) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = touchStartY - currentY;
      const dx = touchStartX - currentX;

      if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= 2) {
        if (e.cancelable) e.preventDefault();
        const dir = Math.sign(dy);
        playerRef.current.intent(dir, 750);
        touchStartY = currentY;
        touchStartX = currentX;
      }
    };

    if (stage) {
      stage.addEventListener('touchstart', onTouchStart, { passive: true });
      stage.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    // Scrollbar manual drag fallback (only when user actively drags scrollbar)
    const onScroll = () => {
      if (!playerRef.current?.ready || isProgrammaticScrollRef.current) return;
      const scrollDistance = Math.max(1, journey.offsetHeight - window.innerHeight);
      const expectedScrollY = Math.round((playerRef.current.time / (DURATION - FRAME)) * scrollDistance);
      // Only seek if user manually dragged the scrollbar thumb far (> 160px)
      if (Math.abs(window.scrollY - expectedScrollY) > 160) {
        const ratio = Math.min(Math.max(window.scrollY / scrollDistance, 0), 1);
        playerRef.current.seek(ratio * (DURATION - FRAME));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Keyboard navigation
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        playerRef.current?.intent(1, 600);
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        playerRef.current?.intent(-1, 600);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKeyDown);
      if (stage) {
        stage.removeEventListener('touchstart', onTouchStart);
        stage.removeEventListener('touchmove', onTouchMove);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 5. AUTO-SCROLL ENGINE — cinematic playback, pauses on user interaction
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Controlled forward drive per tick — tight grace prevents runaway inertia / overshoot
    const AUTO_GRACE = 400; // ms of continuous intent per rAF tick

    let autoRaf = 0;
    let userIdleTimer = 0;
    let isPaused = false;
    let isRunning = false;

    const resume = () => {
      isPaused = false;
    };

    const pauseForUser = () => {
      isPaused = true;
      clearTimeout(userIdleTimer);
      // Resume auto-scroll 6 s after the last user interaction
      userIdleTimer = window.setTimeout(resume, 6000);
    };

    const tick = () => {
      autoRaf = 0;
      const player = playerRef.current;
      if (!player?.ready || document.hidden || !isRunning) {
        scheduleNext();
        return;
      }
      if (isPaused) {
        scheduleNext();
        return;
      }
      const now = performance.now();
      // Hold at chapter transitions (set by updateChapter)
      if (now < autoHoldUntilRef.current) {
        scheduleNext();
        return;
      }
      // Drive the film forward — stop at the very last frame
      if (player.time < DURATION - FRAME * 2) {
        player.intent(1, AUTO_GRACE);
      }
      scheduleNext();
    };

    const scheduleNext = () => {
      if (isRunning) autoRaf = requestAnimationFrame(tick);
    };

    // Any user interaction pauses auto-scroll for 6 s
    const onInteract = () => pauseForUser();
    window.addEventListener('wheel', onInteract, { passive: true });
    window.addEventListener('touchstart', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract, { passive: true });
    window.addEventListener('mousedown', onInteract, { passive: true });

    // Start once player is ready — poll until loaded
    const startWhenReady = () => {
      if (playerRef.current?.ready) {
        isRunning = true;
        // Brief initial hold so the opening title renders before scrolling
        autoHoldUntilRef.current = performance.now() + 2000;
        scheduleNext();
      } else {
        setTimeout(startWhenReady, 400);
      }
    };
    startWhenReady();

    return () => {
      isRunning = false;
      if (autoRaf) cancelAnimationFrame(autoRaf);
      clearTimeout(userIdleTimer);
      window.removeEventListener('wheel', onInteract);
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('mousedown', onInteract);
    };
  }, []);

  // Jump to next chapter on click
  const handleNextChapter = () => {
    if (activeChapter >= STARTS.length - 1) {
      playerRef.current?.seek(0);
    } else {
      const nextTime = STARTS[activeChapter + 1];
      playerRef.current?.seek(nextTime);
    }
  };

  const handleJumpToChapter = (chapterIdx: number) => {
    const targetTime = STARTS[chapterIdx];
    playerRef.current?.seek(targetTime);
  };

  // Music mute toggle
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  // Open/Close Dialogs
  const openCelebrations = (e: React.MouseEvent) => {
    e.preventDefault();
    playerRef.current?.stop();
    detailsDialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
  };

  const closeCelebrations = () => {
    detailsDialogRef.current?.close();
    document.body.style.overflow = '';
  };


  // ─────────────────────────────────────────────────────────────
  // 5. ICS CALENDAR DOWNLOAD
  // ─────────────────────────────────────────────────────────────
  const downloadIcs = (e: React.MouseEvent) => {
    e.preventDefault();
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kishor and Deepthi//Wedding Invitation//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:kishor-deepthi-2026-reception@suvidharesorts.com',
      'DTSTART:20261119T183000',
      'DTEND:20261119T223000',
      'SUMMARY:Chi. Ry. Kishor & Chi. Sou. Deepthi - Wedding Reception',
      'LOCATION:SUVIDHA RESORTS (AJJI THOTA), Opp. Acharya College, Thammenahallipalya, Bangalore North - 562162',
      'DESCRIPTION:Wedding Reception of Chi. Ry. Kishor. V M.B.A. & Chi. Sou. Deepthi. V M.B.A. (06:30 PM onwards).',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:kishor-deepthi-2026-muhurtham@suvidharesorts.com',
      'DTSTART:20261120T091000',
      'DTEND:20261120T123000',
      'SUMMARY:Chi. Ry. Kishor & Chi. Sou. Deepthi - Wedding Muhurtham',
      'LOCATION:SUVIDHA RESORTS (AJJI THOTA), Opp. Acharya College, Thammenahallipalya, Bangalore North - 562162',
      'DESCRIPTION:Auspicious Muhurtham (Lagnam: Dhanassu) from 09:10 AM to 10:10 AM followed by traditional lunch.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Kishor-and-Deepthi-Wedding.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* ── FILM PRELOADER ────────────────────────────────────── */}
      <div
        id="film-loader"
        className={`film-loader ${!loading ? 'is-done' : ''}`}
        role="status"
        aria-live="polite"
        aria-busy={loading}
      >
        <p className="film-loader-label">{loadLabel}</p>
        <div className="film-loader-track" aria-hidden="true">
          <span ref={loaderFillRef} />
        </div>
        <p className="film-loader-pct">{loadPct}%</p>
      </div>

      <a href="#celebrations" className="skip-link" onClick={openCelebrations}>
        Skip the film to wedding details
      </a>

      {/* ── SCROLLABLE JOURNEY CONTAINER ──────────────────────── */}
      <main id="top">
        <section
          ref={journeyRef}
          className="journey"
          id="journey"
          aria-label="A journey to our beginning"
        >
          <div ref={stageRef} className="journey-stage">
            {/* ── HEADER ────────────────────────────────────────── */}
            <header className="site-header">
              <a
                className="header-link"
                href="#celebrations"
                onClick={openCelebrations}
              >
                The celebrations <span aria-hidden="true">↗</span>
              </a>
              <button
                type="button"
                className="music-toggle"
                aria-label={isMuted ? 'Unmute music' : 'Mute music'}
                onClick={toggleMute}
              >
                {isMuted ? '♪ off' : '♪ on'}
              </button>
            </header>

            {/* ── 4K ULTRA-HD CINEMATIC BACKDROPS (CRYSTAL CLEAR & CRISP) ── */}
            <div className="backdrop-4k-container" aria-hidden="true">
              {CHAPTER_4K_IMAGES.map((src, i) => (
                <div
                  key={i}
                  className={`backdrop-4k-slide ${
                    activeChapter === i ? 'is-active' : ''
                  }`}
                  style={{ backgroundImage: `url(${src})` }}
                />
              ))}
            </div>

            {/* ── CINEMATIC FILM CANVAS ─────────────────────────── */}
            <div className="film-region">
              <div className="film-border">
                <canvas
                  id="journey-video"
                  ref={canvasRef}
                  role="img"
                  aria-label="Journey from the temple entrance through carved corridors to an arch overlooking the sea"
                />
              </div>
            </div>

            {/* ── CHAPTER COPY OVERLAYS ─────────────────────────── */}
            <div className="copy-region" id="copy-region">
              {/* 01 THE BEGINNING */}
              <article
                ref={heroRef}
                className={`chapter-copy hero-depth ${
                  activeChapter === 0 ? 'is-active' : ''
                }`}
                data-start="0"
                data-name="The beginning"
              >
                <div ref={heroContentRef} className="hero-content">
                  <p className="eyebrow">{config.hero.supertitle}</p>
                  <h1>
                    <span>{config.groom.firstName}</span> <em>&</em>{' '}
                    <span>{config.bride.firstName}</span>
                  </h1>
                  {/* Subtitle removed per user request (2nd pic) */}
                  <p className="hero-date">
                    {config.hero.dateRange}
                    {config.hero.location && <span>{config.hero.location}</span>}
                  </p>
                </div>
              </article>

              {/* 02 THE BLESSING */}
              <article
                className={`chapter-copy ${
                  activeChapter === 1 ? 'is-active' : ''
                }`}
                data-start="7"
                data-name="The blessing"
                aria-hidden={activeChapter !== 1}
              >
                <p className="eyebrow">{config.sections.blessing.supertitle}</p>
                <h2>
                  {config.sections.blessing.headline1}
                  <br />
                  <em>{config.sections.blessing.headline2}</em>
                </h2>
                <p className="copy-note">
                  {config.sections.blessing.body1}
                  <br />
                  {config.sections.blessing.body2}
                </p>
              </article>

              {/* 03 THE LIGHT */}
              <article
                className={`chapter-copy ${
                  activeChapter === 2 ? 'is-active' : ''
                }`}
                data-start="15.5"
                data-name="The light"
                aria-hidden={activeChapter !== 2}
              >
                <p className="eyebrow">{config.sections.light.supertitle}</p>
                <h2>
                  {config.sections.light.headline1}
                  <br />
                  <em>{config.sections.light.headline2}</em>
                </h2>
                {/* Body caption removed per user request (3rd pic) */}
              </article>

              {/* 04 THE GATHERING */}
              <article
                className={`chapter-copy ${
                  activeChapter === 3 ? 'is-active' : ''
                }`}
                data-start="26.5"
                data-name="The gathering"
                aria-hidden={activeChapter !== 3}
              >
                <p className="eyebrow">
                  {config.sections.gathering.supertitle}
                </p>
                <h2>
                  {config.sections.gathering.headline1}
                  <br />
                  <em>{config.sections.gathering.headline2}</em>
                </h2>
                <div className="film-events">
                  {config.sections.gathering.events.map((ev, i) => (
                    <p key={i}>
                      <span>{ev.date} · {ev.time}</span> {ev.name}
                    </p>
                  ))}
                </div>
              </article>

              {/* 05 THE HORIZON */}
              <article
                className={`chapter-copy ${
                  activeChapter === 4 ? 'is-active' : ''
                }`}
                data-start="37"
                data-name="The horizon"
                aria-hidden={activeChapter !== 4}
              >
                <p className="eyebrow">{config.sections.horizon.supertitle}</p>
                <h2>
                  {config.sections.horizon.headline1}
                  <br />
                  <em>{config.sections.horizon.headline2}</em>
                </h2>
                <p className="copy-note">
                  {config.sections.horizon.body1}
                  <br />
                  {config.sections.horizon.body2}
                </p>
              </article>

              {/* 06 THE PROMISE */}
              <article
                className={`chapter-copy ${
                  activeChapter === 5 ? 'is-active' : ''
                }`}
                data-start="44"
                data-name="The promise"
                aria-hidden={activeChapter !== 5}
              >
                <p className="eyebrow">{config.sections.promise.supertitle}</p>
                <h2>
                  {config.sections.promise.headline1}
                  <br />
                  <em>{config.sections.promise.headline2}</em>
                </h2>
                <p className="copy-note">
                  {config.sections.promise.body1}
                  <br />
                  {config.sections.promise.body2}
                </p>
                <a
                  href="#celebrations"
                  className="text-link"
                  onClick={openCelebrations}
                >
                  The wedding details <span aria-hidden="true">↓</span>
                </a>
              </article>
            </div>

            {/* ── DESKTOP CHAPTER NAVIGATION ────────────────────── */}
            <nav className="chapter-nav" aria-label="Film chapters">
              {CHAPTER_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  data-chapter={i}
                  aria-label={name}
                  aria-current={activeChapter === i ? 'step' : undefined}
                  onClick={() => handleJumpToChapter(i)}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <i />
                </button>
              ))}
            </nav>

            {/* ── STICKY FOOTER ─────────────────────────────────── */}
            <footer className="journey-footer">
              <span className="chapter-caption">
                <b id="chapter-number">
                  {String(activeChapter + 1).padStart(2, '0')}
                </b>
                <span id="chapter-name">{CHAPTER_NAMES[activeChapter]}</span>
              </span>
              <span
                className="media-status"
                id="media-status"
                role="status"
              >
                {mediaStatus}
              </span>
              <button
                className="scroll-cue"
                id="next-chapter"
                type="button"
                onClick={handleNextChapter}
              >
                {activeChapter === 5
                  ? 'Back to the beginning '
                  : 'Scroll to unfold '}
                <span aria-hidden="true">
                  {activeChapter === 5 ? '↑' : '↓'}
                </span>
              </button>
            </footer>

            {/* ── TOP-TO-BOTTOM PROGRESS BAR ────────────────────── */}
            <div className="progress" aria-hidden="true">
              <span ref={progressFillRef} id="progress-fill" />
            </div>
          </div>
        </section>
      </main>

      {/* ── WEDDING DETAILS DIALOG (#celebrations) ─────────────── */}
      <dialog
        ref={detailsDialogRef}
        id="wedding-details"
        aria-labelledby="details-title"
      >
        <button
          type="button"
          className="dialog-close"
          id="close-details"
          aria-label="Close wedding details"
          onClick={closeCelebrations}
        >
          ×
        </button>

        <div className="card-invocations" style={{ textAlign: 'center', marginBottom: '14px', color: 'var(--gold)', fontSize: '11px', letterSpacing: '0.08em' }}>
          <p>|| Sri Lakshmivenkateshwara Swamy Prasanna || &nbsp; || Sri Muthuraya Swamy Prasanna ||</p>
        </div>

        <p className="small-label" style={{ textAlign: 'center', letterSpacing: '0.15em' }}>
          SOLICIT YOUR GRACIOUS PRESENCE ON THE WEDDING OF
        </p>

        <h2 id="details-title" style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          {config.groom.fullName}
          <br />
          <em style={{ fontSize: '0.75em', color: 'var(--gold)' }}>&amp;</em>
          <br />
          {config.bride.fullName}
        </h2>

        <div className="family-section" style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '16px 0', margin: '16px 0', fontSize: '12px', lineHeight: '1.7', color: '#554e44' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: 'var(--ink)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Son of:</strong>
            <p>{config.parents.groom.names} {config.parents.groom.lineage}</p>
            <p style={{ color: '#776e62' }}>{config.parents.groom.address}</p>
          </div>
          <div>
            <strong style={{ color: 'var(--ink)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daughter of:</strong>
            <p>{config.parents.bride.names}</p>
            <p style={{ color: '#776e62' }}>{config.parents.bride.address}</p>
          </div>
        </div>

        <div className="events" id="events-list">
          {config.sections.gathering.events.map((ev, i) => (
            <div className="event" key={i}>
              <span className="event-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="small-label">
                  {ev.fullDate}
                </p>
                <h3>{ev.name}</h3>
                <p style={{ fontWeight: 500, color: 'var(--ink)' }}>{ev.note}</p>
                <p>{ev.description}</p>
              </div>
              <div className="event-details">
                <span>Traditional attire</span>
              </div>
            </div>
          ))}
        </div>

        <div className="venue-card" style={{ background: '#f5f0e8', border: '1px solid #d4cdc0', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }}>
          <p className="small-label" style={{ color: '#886d42', marginBottom: '4px' }}>WEDDING VENUE</p>
          <h4 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--ink)' }}>{config.venue.name}</h4>
          <p style={{ margin: '0', fontSize: '13px', color: '#665f53', lineHeight: '1.5' }}>
            {config.venue.landmark}, {config.venue.hobli}
          </p>
        </div>

        <div style={{ textAlign: 'center', margin: '14px 0', fontSize: '11px', color: '#776e62' }}>
          <p style={{ margin: '4px 0', fontWeight: 500 }}>Awaiting your gracious presence:</p>
          <p style={{ margin: '0' }}>{config.parents.awaitingPresence.join(' · ')}</p>
          <p style={{ margin: '6px 0 0', fontStyle: 'italic', color: '#a08558' }}>{config.parents.compliments}</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
          <a
            className="text-link"
            id="save-date"
            href="#save-dates"
            onClick={downloadIcs}
          >
            Save the dates ↗
          </a>
        </div>
      </dialog>

      {/* ── BACKGROUND MUSIC (Starts directly from "Kanmaniyee..." hook) ── */}
      <audio
        ref={audioRef}
        src="/audio/bg-music.mp3"
        preload="auto"
        style={{ display: 'none' }}
        onLoadedMetadata={(e) => {
          if (e.currentTarget.currentTime < 40) {
            e.currentTarget.currentTime = 48.7;
          }
        }}
        onEnded={(e) => {
          // Loop seamlessly back to "Kanmaniyee..." rather than the full intro
          e.currentTarget.currentTime = 48.7;
          e.currentTarget.play().catch(() => {});
        }}
      />
    </>
  );
};
