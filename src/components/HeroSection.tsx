import { useRef } from 'react';
import { useHeroZoom, useHeroTextFadeOut } from '../hooks/useScrollAnimations';
import type { InvitationConfig } from '../data/invitation.config';

interface HeroSectionProps {
  config: InvitationConfig;
  sectionRef: React.RefObject<HTMLElement | null>;
}

export function HeroSection({ config, sectionRef }: HeroSectionProps) {
  const bgRef   = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useHeroZoom(bgRef, sectionRef);
  useHeroTextFadeOut(textRef, sectionRef);

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="hero-section"
      id="section-hero"
      aria-label="Hero — Couple names"
    >
      {/* Parchment background — same as reference */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-parchment)',
          zIndex: 0,
        }}
      />

      {/* Gopuram image — lower section on mobile, elegantly framed on desktop */}
      <div
        ref={bgRef}
        className="hero-bg"
        style={{
          backgroundImage: `url(${config.images.hero})`,
        }}
        role="img"
        aria-label="Ramanathaswamy Temple gopuram"
      />

      {/* Gradient — blends image into the parchment background above */}
      <div className="hero-top-fade" />

      {/* Bottom fade — where hero darkens into next section */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: 0,
          height: '28%',
          background: 'linear-gradient(to top, rgba(10,8,6,0.55) 0%, transparent 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Text block — upper portion, fades out as scroll begins */}
      <div
        ref={textRef}
        className="hero-text-top"
        style={{ zIndex: 3 }}
      >
        <p className="hero-supertitle">{config.hero.supertitle}</p>
        <div className="hero-names">
          <h1 className="hero-name">{config.groom.firstName}</h1>
          <span className="hero-ampersand">&amp;</span>
          <h2 className="hero-name">{config.bride.firstName}</h2>
        </div>
        <p className="hero-tagline">
          {config.hero.tagline1}
          <br />
          {config.hero.tagline2}
        </p>
        <p className="hero-date">
          {config.hero.dateRange}
          <br />
          {config.hero.location}
        </p>
      </div>
    </section>
  );
}

