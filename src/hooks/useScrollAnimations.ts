import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-driven parallax hook.
 * Moves background at `speed` fraction of scroll distance.
 * speed=0.35 → background moves at 35% of full scroll speed (nice subtle parallax)
 */
export function useParallax(
  bgRef: React.RefObject<HTMLElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>,
  speed = 0.35
) {
  useEffect(() => {
    const bg = bgRef.current;
    const section = sectionRef.current;
    if (!bg || !section) return;

    const ctx = gsap.context(() => {
      const range = speed * 25;
      gsap.fromTo(
        bg,
        { yPercent: -range },
        {
          yPercent: range,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [bgRef, sectionRef, speed]);
}

/**
 * Fade-up text reveal driven by GSAP ScrollTrigger (not CSS class toggling).
 * Starts hidden; animates in when section top crosses 80% of viewport.
 */
export function useTextReveal(
  textRef: React.RefObject<HTMLElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>,
  delay = 0
) {
  useEffect(() => {
    const text = textRef.current;
    const section = sectionRef.current;
    if (!text || !section) return;

    // Set initial hidden state immediately (before any scroll)
    gsap.set(text, { opacity: 0, y: 32 });

    const ctx = gsap.context(() => {
      gsap.to(text, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    return () => ctx.revert();
  }, [textRef, sectionRef, delay]);
}

/**
 * Staggered children reveal for event list rows.
 */
export function useStaggerReveal(
  containerRef: React.RefObject<HTMLElement | null>,
  childSelector: string,
  sectionRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    const section = sectionRef.current;
    if (!container || !section) return;

    const children = container.querySelectorAll(childSelector);
    gsap.set(children, { opacity: 0, y: 20 });

    const ctx = gsap.context(() => {
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: 'power2.out',
        stagger: 0.18,
        scrollTrigger: {
          trigger: section,
          start: 'top 72%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    return () => ctx.revert();
  }, [containerRef, sectionRef, childSelector]);
}

/**
 * Hero zoom — scales the gopuram photo as user scrolls down.
 * Gives the cinematic "fly-into-the-temple" feel from the reference.
 */
export function useHeroZoom(
  bgRef: React.RefObject<HTMLElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const bg = bgRef.current;
    const section = sectionRef.current;
    if (!bg || !section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bg,
        { scale: 1.0, transformOrigin: 'center 60%' },
        {
          scale: 1.75,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.4,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [bgRef, sectionRef]);
}

/**
 * Hero text fade-out as user begins scrolling away from hero.
 */
export function useHeroTextFadeOut(
  textRef: React.RefObject<HTMLElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const text = textRef.current;
    const section = sectionRef.current;
    if (!text || !section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        text,
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: -24,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '30% top',
            scrub: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [textRef, sectionRef]);
}

/**
 * Track which section is in view for the bottom nav label.
 */
export function useActiveSection(
  sectionRefs: React.RefObject<HTMLElement | null>[],
  callback: (index: number) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const handleScroll = useCallback(() => {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    for (let i = sectionRefs.length - 1; i >= 0; i--) {
      const el = sectionRefs[i].current;
      if (!el) continue;
      if (el.offsetTop <= scrollMid) {
        callbackRef.current(i);
        return;
      }
    }
    callbackRef.current(0);
  }, [sectionRefs]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
}

