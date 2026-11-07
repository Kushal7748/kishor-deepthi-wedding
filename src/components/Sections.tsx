import { useRef } from 'react';
import {
  useParallax,
  useTextReveal,
  useStaggerReveal,
} from '../hooks/useScrollAnimations';
import type { InvitationConfig } from '../data/invitation.config';

interface SectionProps {
  config: InvitationConfig;
  sectionRef: React.RefObject<HTMLElement | null>;
}

/* ─────────────────────────── THE BLESSING ─────────────────────────── */
export function BlessingSection({ config, sectionRef }: SectionProps) {
  const bgRef   = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useParallax(bgRef, sectionRef, 0.38);
  useTextReveal(textRef, sectionRef);

  const s = config.sections.blessing;

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="invitation-section"
      id="section-blessing"
      aria-label={s.label}
    >
      <div
        ref={bgRef}
        className="section-bg"
        style={{ backgroundImage: `url(${config.images.blessing})` }}
      />
      <div className="section-overlay overlay-blessing" />

      <div ref={textRef} className="section-text">
        <p className="supertitle">{s.supertitle}</p>
        <h2 className="headline">
          {s.headline1}
          <br />
          <em className="headline-italic">{s.headline2}</em>
        </h2>
        <p className="body-copy">
          {s.body1}
          <br />
          {s.body2}
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── THE LIGHT ───────────────────────────── */
export function LightSection({ config, sectionRef }: SectionProps) {
  const bgRef   = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useParallax(bgRef, sectionRef, 0.42);
  useTextReveal(textRef, sectionRef);

  const s = config.sections.light;

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="invitation-section"
      id="section-light"
      aria-label={s.label}
    >
      <div
        ref={bgRef}
        className="section-bg"
        style={{ backgroundImage: `url(${config.images.light})` }}
      />
      <div className="section-overlay overlay-light" />

      <div ref={textRef} className="section-text">
        <p className="supertitle">{s.supertitle}</p>
        <h2 className="headline">
          {s.headline1}
          <br />
          <em className="headline-italic">{s.headline2}</em>
        </h2>
        <p className="body-copy">
          {s.body1}
          <br />
          {s.body2}
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── THE GATHERING ────────────────────────── */
interface GatheringSectionProps extends SectionProps {
  onOpenRsvp: () => void;
}

export function GatheringSection({ config, sectionRef }: GatheringSectionProps) {
  const bgRef      = useRef<HTMLDivElement>(null);
  const textRef    = useRef<HTMLDivElement>(null);
  const eventsRef  = useRef<HTMLDivElement>(null);

  useParallax(bgRef, sectionRef, 0.38);
  useTextReveal(textRef, sectionRef);
  useStaggerReveal(eventsRef, '.event-row', sectionRef);

  const s = config.sections.gathering;

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="invitation-section"
      id="section-gathering"
      aria-label={s.label}
    >
      <div
        ref={bgRef}
        className="section-bg"
        style={{ backgroundImage: `url(${config.images.gathering})` }}
      />
      <div className="section-overlay overlay-gathering" />

      <div ref={textRef} className="section-text">
        <p className="supertitle">{s.supertitle}</p>
        <h2 className="headline">
          {s.headline1}
          <br />
          <em className="headline-italic">{s.headline2}</em>
        </h2>

        {/* Event schedule — stagger-revealed */}
        <div ref={eventsRef} className="events-table">
          {s.events.map((event, i) => (
            <div key={i} className="event-row">
              <span className="event-when">
                {event.date}&nbsp;·&nbsp;{event.time}
              </span>
              <span className="event-name">{event.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── THE HORIZON ──────────────────────────── */
export function HorizonSection({ config, sectionRef }: SectionProps) {
  const bgRef   = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useParallax(bgRef, sectionRef, 0.35);
  useTextReveal(textRef, sectionRef);

  const s = config.sections.horizon;

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="invitation-section"
      id="section-horizon"
      aria-label={s.label}
    >
      <div
        ref={bgRef}
        className="section-bg"
        style={{ backgroundImage: `url(${config.images.horizon})` }}
      />
      <div className="section-overlay overlay-horizon" />

      <div ref={textRef} className="section-text">
        <p className="supertitle">{s.supertitle}</p>
        <h2 className="headline">
          {s.headline1}
          <br />
          <em className="headline-italic">{s.headline2}</em>
        </h2>
        <p className="body-copy">
          {s.body1}
          <br />
          {s.body2}
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────── THE PROMISE ──────────────────────────── */
interface PromiseSectionProps extends SectionProps {
  onOpenRsvp: () => void;
}

export function PromiseSection({ config, sectionRef, onOpenRsvp }: PromiseSectionProps) {
  const bgRef   = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useParallax(bgRef, sectionRef, 0.32);
  useTextReveal(textRef, sectionRef);

  const s = config.sections.promise;

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="invitation-section"
      id="section-promise"
      aria-label={s.label}
    >
      <div
        ref={bgRef}
        className="section-bg"
        style={{ backgroundImage: `url(${config.images.promise})` }}
      />
      <div className="section-overlay overlay-promise" />

      <div ref={textRef} className="section-text">
        <p className="supertitle">{s.supertitle}</p>
        <h2 className="headline">
          {s.headline1}
          <br />
          <em className="headline-italic">{s.headline2}</em>
        </h2>
        <p className="body-copy">
          {s.body1}
          <br />
          {s.body2}
        </p>
        <div className="cta-wrapper">
          <button
            className="cta-button"
            onClick={onOpenRsvp}
            type="button"
          >
            {s.ctaButton}&nbsp;<span>→</span>
          </button>
          <button
            className="cta-link"
            type="button"
            onClick={() =>
              document
                .getElementById('section-gathering')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            {s.ctaLink}&nbsp;<span>↓</span>
          </button>
        </div>
      </div>
    </section>
  );
}
