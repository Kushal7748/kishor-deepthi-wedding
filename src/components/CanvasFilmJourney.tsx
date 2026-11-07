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
const DURATION = 50.416667;
const FRAME = 1 / 24;
const KANMANIYE_CUE = 48.7;

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
  const chapterCopiesRef = useRef<HTMLElement[]>([]);

  const playerRef = useRef<FramePlayer | null>(null);
  const lastChapterRef = useRef<number>(-1);
  const autoHoldUntilRef = useRef<number>(0);
  const idleResumeTimerRef = useRef<number>(0);
  const autoPlayEnabledRef = useRef<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Preparing your journey…');
  const [activeChapter, setActiveChapter] = useState(0);
  const [mediaStatus, setMediaStatus] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // Cache chapter copy elements on mount
  useEffect(() => {
    chapterCopiesRef.current = Array.from(
      document.querySelectorAll<HTMLElement>('.chapter-copy')
    );
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1. AUDIO AUTOPLAY (Starts directly upon opening, unmuted on first gesture if restricted)
  // ─────────────────────────────────────────────────────────────
  const startAudioPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.currentTime < 40 && audio.readyState >= 1) {
      try {
        audio.currentTime = KANMANIYE_CUE;
      } catch {
        // seek on loaded
      }
    }
    audio.muted = false;
    audio.volume = 0.7;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsAudioPlaying(true);
          setIsMuted(false);
        })
        .catch(() => {
          // Browser autoplay restriction: will be unlocked on the very first touch/scroll
        });
    }
  }, []);

  useEffect(() => {
    // Attempt instant autoplay directly as soon as the site opens
    startAudioPlayback();

    // Universal gesture unlocker: starts unmuted sound the moment user touches anywhere on mobile
    const unlockAudio = () => {
      startAudioPlayback();
      const events = ['touchstart', 'touchend', 'click', 'pointerdown', 'scroll', 'keydown'];
      events.forEach((ev) => {
        window.removeEventListener(ev, unlockAudio, true);
        document.removeEventListener(ev, unlockAudio, true);
      });
    };

    const events = ['touchstart', 'touchend', 'click', 'pointerdown', 'scroll', 'keydown'];
    events.forEach((ev) => {
      window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
      document.addEventListener(ev, unlockAudio, { capture: true, passive: true });
    });

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, unlockAudio, true);
        document.removeEventListener(ev, unlockAudio, true);
      });
    };
  }, [startAudioPlayback]);

  // ─────────────────────────────────────────────────────────────
  // 2. HERO DEPTH MOTION (subtle parallax)
  // ─────────────────────────────────────────────────────────────
  const updateHeroDepth = useCallback((time: number) => {
    const heroContent = heroContentRef.current;
    if (!heroContent) return;
    if (time >= STARTS[1]) return;

    const depth = Math.min(Math.max(time / 5, 0), 1);
    heroContent.style.transform = `translateY(${-depth * 18}px) scale(${
      1 - depth * 0.06
    })`;
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. CHAPTER VISIBILITY & OPACITY TRANSITIONS
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

      // When auto-scroll crosses into Chapter 4 (The Gathering / Dates), pause briefly to read
      if (idx !== lastChapterRef.current) {
        lastChapterRef.current = idx;
        if (idx === 3 && autoPlayEnabledRef.current) {
          const holdMs = 3200;
          autoHoldUntilRef.current = performance.now() + holdMs;
          playerRef.current?.pause();
          window.setTimeout(() => {
            if (autoPlayEnabledRef.current && !document.querySelector('dialog[open]')) {
              playerRef.current?.play();
              setIsAutoScrolling(true);
            }
          }, holdMs);
        }
      }

      // Fast cached chapter opacity fade
      const copies = chapterCopiesRef.current.length > 0
        ? chapterCopiesRef.current
        : Array.from(document.querySelectorAll<HTMLElement>('.chapter-copy'));

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

      // Update hero subtle depth motion
      updateHeroDepth(time);
    },
    [updateHeroDepth]
  );

  // ─────────────────────────────────────────────────────────────
  // 4. INITIALIZE FRAME PLAYER & PLAYBACK
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

        // Start film playback smoothly directly upon opening
        window.setTimeout(() => {
          if (autoPlayEnabledRef.current && !document.querySelector('dialog[open]')) {
            player.play();
            setIsAutoScrolling(true);
          }
        }, 800);

        // Directly kick off audio playback
        startAudioPlayback();
      },
      onFrame(time) {
        updateChapter(time);
      },
      onPlayStateChange(playing) {
        setIsAutoScrolling(playing);
      },
      onEnd() {
        // At the end of the film journey, hold for 3.5 seconds on the final promise
        // and then smoothly loop back to Chapter 1 (The Beginning)
        window.setTimeout(() => {
          if (autoPlayEnabledRef.current && !document.querySelector('dialog[open]')) {
            player.seek(0);
            window.setTimeout(() => {
              if (autoPlayEnabledRef.current && !document.querySelector('dialog[open]')) {
                player.play();
                setIsAutoScrolling(true);
              }
            }, 600);
          }
        }, 3500);
      },
      onError(err) {
        console.warn('Player issue:', err);
        setMediaStatus('Loading next moments…');
      },
    });

    playerRef.current = player;
    player.load();

    // Debounced resize for mobile orientation and screen size changes
    let lastW = window.innerWidth;
    let lastH = window.innerHeight;
    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      if (Math.abs(nw - lastW) > 15 || Math.abs(nh - lastH) > 35) {
        lastW = nw;
        lastH = nh;
        player.resize();
        updateHeroDepth(player.time);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(idleResumeTimerRef.current);
      player.dispose();
    };
  }, [updateChapter, updateHeroDepth, startAudioPlayback]);

  // ─────────────────────────────────────────────────────────────
  // 5. TOUCH & SCROLL CONTROLLERS (WITH SEAMLESS AUTO-RESUME)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current;

    const scheduleAutoResume = (delay = 1400) => {
      if (!autoPlayEnabledRef.current) return;
      clearTimeout(idleResumeTimerRef.current);
      idleResumeTimerRef.current = window.setTimeout(() => {
        if (autoPlayEnabledRef.current && !document.querySelector('dialog[open]')) {
          playerRef.current?.play();
          setIsAutoScrolling(true);
        }
      }, delay);
    };

    // Wheel & Trackpad
    const onWheel = (e: WheelEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      playerRef.current?.intent(dir, 500);
      scheduleAutoResume();
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    // Touch: natural mobile gesture momentum
    let touchStartY = 0;
    let touchStartX = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        playerRef.current?.pause();
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
        playerRef.current.intent(dir, 600);
        touchStartY = currentY;
        touchStartX = currentX;
      }
    };

    const onTouchEnd = () => {
      scheduleAutoResume(1200);
    };

    if (stage) {
      stage.addEventListener('touchstart', onTouchStart, { passive: true });
      stage.addEventListener('touchmove', onTouchMove, { passive: false });
      stage.addEventListener('touchend', onTouchEnd, { passive: true });
      stage.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    // Keyboard navigation
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        playerRef.current?.intent(1, 550);
        scheduleAutoResume();
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        playerRef.current?.intent(-1, 550);
        scheduleAutoResume();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      if (stage) {
        stage.removeEventListener('touchstart', onTouchStart);
        stage.removeEventListener('touchmove', onTouchMove);
        stage.removeEventListener('touchend', onTouchEnd);
        stage.removeEventListener('touchcancel', onTouchEnd);
      }
    };
  }, []);

  // Jump to next chapter on click
  const handleNextChapter = () => {
    if (activeChapter >= STARTS.length - 1) {
      playerRef.current?.seek(0);
      if (autoPlayEnabledRef.current) {
        playerRef.current?.play();
      }
    } else {
      const nextTime = STARTS[activeChapter + 1];
      playerRef.current?.seek(nextTime);
      if (autoPlayEnabledRef.current) {
        window.setTimeout(() => {
          playerRef.current?.play();
        }, 300);
      }
    }
  };

  const handleJumpToChapter = (chapterIdx: number) => {
    const targetTime = STARTS[chapterIdx];
    playerRef.current?.seek(targetTime);
    if (autoPlayEnabledRef.current) {
      window.setTimeout(() => {
        playerRef.current?.play();
      }, 300);
    }
  };

  // Auto-scroll toggle
  const toggleAutoScroll = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isAutoScrolling) {
      player.pause();
      autoPlayEnabledRef.current = false;
      setIsAutoScrolling(false);
      clearTimeout(idleResumeTimerRef.current);
    } else {
      autoPlayEnabledRef.current = true;
      setIsAutoScrolling(true);
      player.play();
    }
  };

  // Music mute/play toggle
  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (audio.currentTime < 40 && audio.readyState >= 1) {
        try {
          audio.currentTime = KANMANIYE_CUE;
        } catch {
          // ignore
        }
      }
      audio.muted = false;
      audio.play().then(() => {
        setIsAudioPlaying(true);
        setIsMuted(false);
      }).catch(() => {});
    } else {
      if (audio.muted) {
        audio.muted = false;
        setIsMuted(false);
      } else {
        audio.muted = true;
        setIsMuted(true);
      }
    }
  };

  // Open/Close Dialogs
  const openCelebrations = (e: React.MouseEvent) => {
    e.preventDefault();
    playerRef.current?.pause();
    detailsDialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
  };

  const closeCelebrations = () => {
    detailsDialogRef.current?.close();
    document.body.style.overflow = '';
    if (autoPlayEnabledRef.current) {
      playerRef.current?.play();
      setIsAutoScrolling(true);
    }
  };

  // ICS Calendar Download
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
            {/* ── HEADER (Optimized for Mobile Phone Touch & Layout) ── */}
            <header className="site-header">
              <a
                className="header-link header-badge"
                href="#celebrations"
                onClick={openCelebrations}
                aria-label="Open wedding celebrations and invitation details"
              >
                Wedding Details <span aria-hidden="true">↗</span>
              </a>

              <div className="header-controls">
                <button
                  type="button"
                  className={`ctrl-badge autoscroll-toggle ${isAutoScrolling ? 'is-active' : ''}`}
                  aria-label={isAutoScrolling ? 'Pause auto-scrolling' : 'Resume auto-scrolling'}
                  onClick={toggleAutoScroll}
                  title="Toggle auto-scrolling"
                >
                  <span className={`ctrl-dot ${isAutoScrolling ? 'pulsing' : ''}`} />
                  <span>{isAutoScrolling ? 'Auto-scroll ON' : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  className={`ctrl-badge music-toggle ${isAudioPlaying && !isMuted ? 'is-active' : 'is-muted'}`}
                  aria-label={isAudioPlaying && !isMuted ? 'Mute background song' : 'Play background song'}
                  onClick={toggleMusic}
                  title={isAudioPlaying && !isMuted ? 'Song playing (Tap to mute)' : 'Song muted (Tap to play)'}
                >
                  <span className="ctrl-icon">{isAudioPlaying && !isMuted ? '🔊' : '🔇'}</span>
                  <span>{isAudioPlaying && !isMuted ? 'Music ON' : 'Music OFF'}</span>
                </button>
              </div>
            </header>

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

            {/* ── CHAPTER COPY OVERLAYS (Pixel-Perfect Phone Sizing) ── */}
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
                    <span className="name-groom">{config.groom.firstName}</span>{' '}
                    <em className="name-amp">&amp;</em>{' '}
                    <span className="name-bride">{config.bride.firstName}</span>
                  </h1>
                  <p className="hero-date">
                    <span className="hero-dates-text">{config.hero.dateRange}</span>
                    {config.hero.location && <span className="hero-venue-text">{config.hero.location}</span>}
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
                <div className="chapter-inner">
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
                </div>
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
                <div className="chapter-inner">
                  <p className="eyebrow">{config.sections.light.supertitle}</p>
                  <h2>
                    {config.sections.light.headline1}
                    <br />
                    <em>{config.sections.light.headline2}</em>
                  </h2>
                </div>
              </article>

              {/* 04 THE GATHERING (The Celebrations / Events) */}
              <article
                className={`chapter-copy chapter-events ${
                  activeChapter === 3 ? 'is-active' : ''
                }`}
                data-start="26.5"
                data-name="The gathering"
                aria-hidden={activeChapter !== 3}
              >
                <div className="chapter-inner">
                  <p className="eyebrow">
                    {config.sections.gathering.supertitle}
                  </p>
                  <h2>
                    {config.sections.gathering.headline1}
                    <br />
                    <em>{config.sections.gathering.headline2}</em>
                  </h2>
                  <div className="film-events-cards">
                    {config.sections.gathering.events.map((ev, i) => (
                      <div className="event-glass-card" key={i}>
                        <div className="event-badge-tag">{ev.name}</div>
                        <div className="event-time-row">{ev.fullDate}</div>
                        <div className="event-note-row">{ev.note}</div>
                      </div>
                    ))}
                  </div>
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
                <div className="chapter-inner">
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
                </div>
              </article>

              {/* 06 THE PROMISE & INVITATION CALL TO ACTION */}
              <article
                className={`chapter-copy chapter-final ${
                  activeChapter === 5 ? 'is-active' : ''
                }`}
                data-start="44"
                data-name="The promise"
                aria-hidden={activeChapter !== 5}
              >
                <div className="chapter-inner">
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

                  <div className="final-actions-group">
                    <button
                      type="button"
                      className="cta-gold-btn"
                      onClick={openCelebrations}
                    >
                      View Wedding Details ↗
                    </button>
                    <button
                      type="button"
                      className="cta-subtle-btn"
                      onClick={downloadIcs}
                    >
                      Save the Dates 📅
                    </button>
                  </div>
                </div>
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

            {/* ── STICKY FOOTER (Clean Mobile Layout) ───────────── */}
            <footer className="journey-footer">
              <span className="chapter-caption">
                <b id="chapter-number">
                  {String(activeChapter + 1).padStart(2, '0')}
                </b>
                <span className="chapter-caption-sep">/ 06</span>
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
                aria-label={activeChapter === 5 ? 'Replay journey from start' : 'Skip to next chapter'}
              >
                <span className="cue-text">
                  {activeChapter === 5
                    ? 'Replay journey '
                    : 'Next chapter '}
                </span>
                <span className="cue-arrow" aria-hidden="true">
                  {activeChapter === 5 ? '↺' : '→'}
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
        <div className="drawer-handle" aria-hidden="true" />

        <button
          type="button"
          className="dialog-close"
          id="close-details"
          aria-label="Close wedding details"
          onClick={closeCelebrations}
        >
          ×
        </button>

        <div className="card-invocations">
          <p>|| Sri Lakshmivenkateshwara Swamy Prasanna ||</p>
          <p>|| Sri Muthuraya Swamy Prasanna ||</p>
        </div>

        <p className="card-solicit-label">
          SOLICIT YOUR GRACIOUS PRESENCE ON THE WEDDING OF
        </p>

        <h2 id="details-title" className="dialog-couple-names">
          <span className="dialog-name-groom">{config.groom.fullName}</span>
          <br />
          <em className="dialog-amp">&amp;</em>
          <br />
          <span className="dialog-name-bride">{config.bride.fullName}</span>
        </h2>

        <div className="family-section">
          <div className="family-col">
            <strong className="family-title">Son of:</strong>
            <p className="family-names">{config.parents.groom.names}</p>
            <p className="family-lineage">{config.parents.groom.lineage}</p>
            <p className="family-addr">{config.parents.groom.address}</p>
          </div>
          <div className="family-col">
            <strong className="family-title">Daughter of:</strong>
            <p className="family-names">{config.parents.bride.names}</p>
            <p className="family-addr">{config.parents.bride.address}</p>
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
                <p className="event-note-highlight">{ev.note}</p>
                <p>{ev.description}</p>
              </div>
              <div className="event-details">
                <span>Traditional attire</span>
              </div>
            </div>
          ))}
        </div>

        <div className="venue-card">
          <p className="venue-label">WEDDING VENUE</p>
          <h4 className="venue-title">{config.venue.name}</h4>
          <p className="venue-address">
            {config.venue.landmark}, {config.venue.hobli}
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Suvidha+Resorts+Opp+Acharya+College+Thammenahallipalya+Bangalore"
            target="_blank"
            rel="noopener noreferrer"
            className="venue-map-btn"
          >
            📍 Open in Google Maps ↗
          </a>
        </div>

        <div className="family-compliments">
          <p className="awaiting-label">Awaiting your gracious presence:</p>
          <p className="awaiting-names">{config.parents.awaitingPresence.join(' · ')}</p>
          <p className="compliments-text">{config.parents.compliments}</p>
        </div>

        <div className="dialog-footer-actions">
          <button
            type="button"
            className="dialog-save-btn"
            onClick={downloadIcs}
          >
            Save to Phone Calendar 📅
          </button>
        </div>
      </dialog>

      {/* ── BACKGROUND MUSIC (Autoplay with immediate play & loop) ── */}
      <audio
        ref={audioRef}
        src="/audio/bg-music.mp3"
        preload="auto"
        autoPlay
        playsInline
        style={{ display: 'none' }}
        onCanPlay={() => {
          if (audioRef.current && audioRef.current.currentTime < 40) {
            try {
              audioRef.current.currentTime = KANMANIYE_CUE;
            } catch {
              // ignore
            }
          }
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().then(() => {
              setIsAudioPlaying(true);
              setIsMuted(false);
            }).catch(() => {});
          }
        }}
        onPlay={() => {
          setIsAudioPlaying(true);
          setIsMuted(false);
        }}
        onPause={() => {
          setIsAudioPlaying(false);
        }}
        onEnded={(e) => {
          e.currentTarget.currentTime = KANMANIYE_CUE;
          e.currentTarget.play().catch(() => {});
        }}
      />
    </>
  );
};
