import type { InvitationConfig } from '../data/invitation.config';

interface NavProps {
  config: InvitationConfig;
  activeSection: number;
  totalSections: number;
  onScrollToTop: () => void;
  onScrollToNext: () => void;
  isHeroSection: boolean;
}

const SECTION_LABELS = [
  '01 THE BEGINNING',
  '02 THE BLESSING',
  '03 THE LIGHT',
  '04 THE GATHERING',
  '05 THE HORIZON',
  '06 THE PROMISE',
];

export function Navigation({
  config,
  activeSection,
  totalSections,
  onScrollToTop,
  onScrollToNext,
  isHeroSection,
}: NavProps) {
  const isLastSection = activeSection === totalSections - 1;
  const isDarkMode = isHeroSection;   // hero has light parchment bg

  return (
    <>
      {/* Top-right: Celebrations link */}
      <nav className={`nav-top-right${isDarkMode ? ' dark' : ''}`} aria-label="Quick navigation">
        <span>{config.nav.celebrationsLink}</span>
        <span className="arrow">→</span>
      </nav>

      {/* Bottom nav */}
      <div className="nav-bottom" aria-label="Section navigation">
        <span className={`nav-bottom-label${isDarkMode ? ' dark' : ''}`}>
          {SECTION_LABELS[activeSection] ?? SECTION_LABELS[0]}
        </span>

        {isLastSection ? (
          <button
            className="nav-scroll-cta"
            onClick={onScrollToTop}
            type="button"
            aria-label="Back to beginning"
            style={{ color: isDarkMode ? 'rgba(50,42,38,0.55)' : undefined }}
          >
            {config.nav.backLink} <span>↑</span>
          </button>
        ) : (
          <button
            className="nav-scroll-cta"
            onClick={onScrollToNext}
            type="button"
            aria-label="Scroll to next section"
            style={{ color: isDarkMode ? 'rgba(50,42,38,0.55)' : undefined }}
          >
            {config.nav.scrollCta} <span>↓</span>
          </button>
        )}
      </div>
    </>
  );
}

