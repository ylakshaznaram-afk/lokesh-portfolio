import { useState } from 'react';
import { expertise } from '../data/content';
import { Icon } from './Icon';

const FLOW = ['Greeting', 'Intent', 'Clarify', 'Next step', 'Fallback', 'Handoff'];

export function Expertise() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="section expertise" id="expertise" aria-labelledby="expertise-title">
      <div className="container">
        <header className="section-head">
          <p className="kicker">Expertise</p>
          <h2 id="expertise-title" className="section-head__title">
            Four kinds of work, one experience.
          </h2>
          <p className="section-head__lead">From the words a person reads to the integration that answers them.</p>
        </header>
        <ul className="exp__grid">
          {expertise.map((g, i) => {
            const isOpen = open === g.id;
            const panelId = `exp-${g.id}`;
            return (
              <li key={g.id} className={`exp exp--${g.id} reveal ${isOpen ? 'is-open' : ''}`} style={{ ['--i' as string]: i }}>
                <p className="exp__num mono">0{i + 1}</p>
                <h3 className="exp__title">{g.title}</h3>
                <p className="exp__summary">{g.summary}</p>

                {g.id === 'conversation' && (
                  <ol className="exp__flow" aria-label="Typical conversation path">
                    {FLOW.map((s) => (
                      <li key={s} className={`exp__flow-step exp__flow-step--${s.replace(' ', '').toLowerCase()}`}>
                        {s}
                      </li>
                    ))}
                  </ol>
                )}
                {g.id === 'integrations' && (
                  <div className="exp__hub" aria-hidden="true">
                    <span className="exp__hub-core">ServiceNow</span>
                  </div>
                )}

                <ul className={`exp__items exp__items--${g.id}`} aria-label={`${g.title} skills`}>
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>

                <button type="button" className="exp__toggle" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpen(isOpen ? null : g.id)}>
                  <span>{isOpen ? 'Close' : 'In practice'}</span>
                  <Icon name="plus" size={16} className="exp__plus" />
                </button>
                <div id={panelId} className="exp__detail" hidden={!isOpen}>
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
