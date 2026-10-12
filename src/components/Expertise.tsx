import { useState } from 'react';
import { expertise } from '../data/content';
import { Icon } from './Icon';

export function Expertise() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="section expertise" id="expertise" aria-labelledby="expertise-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow section-head__eyebrow">Expertise</p>
          <h2 id="expertise-title" className="section-head__title">
            Four kinds of work, one experience.
          </h2>
          <p className="section-head__lead">Grouped by what the work does, not by how well I rate myself at it.</p>
        </header>
        <ul className="expertise__grid">
          {expertise.map((g, i) => {
            const isOpen = open === g.id;
            const panelId = `exp-${g.id}`;
            return (
              <li
                key={g.id}
                className={`card exp-card exp-card--${g.id} exp-card--${g.accent} reveal ${isOpen ? 'is-open' : ''}`}
                style={{ ['--i' as string]: i }}
              >
                <ExpGlyph id={g.id} />
                <h3 className="exp-card__title">{g.title}</h3>
                <p className="exp-card__summary">{g.summary}</p>
                <ul className="exp-card__items" aria-label={`${g.title} skills`}>
                  {g.items.map((it) => (
                    <li key={it} className="chip">
                      {it}
                    </li>
                  ))}
                </ul>
                {g.id === 'conversation' && (
                  <ol className="exp-flow" aria-label="Typical conversation path">
                    {['Greeting', 'Intent', 'Clarify', 'Next step', 'Fallback', 'Handoff'].map((st) => (
                      <li key={st} className={`exp-flow__step exp-flow__step--${st.replace(' ', '').toLowerCase()}`}>
                        {st}
                      </li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  className="exp-card__toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : g.id)}
                >
                  <span>{isOpen ? 'Less' : 'How I approach it'}</span>
                  <Icon name="plus" size={16} className="exp-card__plus" />
                </button>
                <div id={panelId} className="exp-card__detail" hidden={!isOpen}>
                  <p>{g.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Small diagrammatic glyph per group — a fragment of the engine's language. */
function ExpGlyph({ id }: { id: string }) {
  const common = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg className="exp-card__glyph" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      {id === 'conversation' && (
        <g {...common}>
          <rect x="2" y="4" width="34" height="14" rx="7" stroke="var(--cyan)" />
          <rect x="26" y="22" width="34" height="14" rx="7" stroke="var(--violet)" />
          <circle cx="12" cy="11" r="1.6" fill="var(--cyan)" stroke="none" />
          <circle cx="19" cy="11" r="1.6" fill="var(--cyan)" stroke="none" />
          <circle cx="26" cy="11" r="1.6" fill="var(--cyan)" stroke="none" />
        </g>
      )}
      {id === 'development' && (
        <g {...common} stroke="var(--violet)">
          <rect x="2" y="4" width="22" height="14" rx="4" />
          <rect x="2" y="22" width="22" height="14" rx="4" />
          <rect x="40" y="13" width="22" height="14" rx="4" stroke="var(--cyan)" />
          <path d="M24 11h8v18h-8M32 20h8" />
        </g>
      )}
      {id === 'integrations' && (
        <g {...common}>
          <circle cx="10" cy="20" r="7" stroke="var(--cyan)" />
          <circle cx="54" cy="8" r="5" stroke="var(--violet)" />
          <circle cx="54" cy="32" r="5" stroke="var(--violet)" />
          <circle cx="54" cy="20" r="5" stroke="var(--violet)" />
          <path d="M17 20h32M17 18 49 8M17 22l32 10" stroke="rgba(255,255,255,0.35)" />
        </g>
      )}
      {id === 'quality' && (
        <g {...common}>
          <path d="M4 20h14l6-10 8 20 6-10h22" stroke="var(--violet)" />
          <path d="M44 30l4 4 10-10" stroke="var(--cyan)" />
        </g>
      )}
    </svg>
  );
}
