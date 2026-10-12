import { useEffect, useLayoutEffect, useRef } from 'react';
import { caseStudies } from '../data/content';
import { Icon } from './Icon';
import { CaseVisual, ILLUSTRATIVE } from './visuals';

interface Props {
  slug: string | null;
  onClose: () => void;
  onNavigate: (slug: string) => void;
}

export function CaseDialog({ slug, onClose, onNavigate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const index = caseStudies.findIndex((c) => c.slug === slug);
  const study = index >= 0 ? caseStudies[index] : null;

  // Layout effect so showModal() happens inside the view-transition update.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (study && !d.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      d.showModal();
      document.documentElement.classList.add('is-locked');
      d.querySelector<HTMLElement>('.icon-btn--close')?.focus();
    } else if (!study && d.open) {
      d.close();
      document.documentElement.classList.remove('is-locked');
      const target = returnFocus.current;
      if (target && document.contains(target)) target.focus({ preventScroll: true });
    }
  }, [study]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [slug]);

  useEffect(() => () => document.documentElement.classList.remove('is-locked'), []);

  const prev = caseStudies[(index - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(index + 1) % caseStudies.length];

  return (
    <dialog
      ref={ref}
      className="case-dialog"
      aria-labelledby="case-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {study && (
        <div className="case-dialog__sheet" ref={scrollRef}>
          <div className="case-dialog__bar">
            <p className="mono">
              Case study {study.index} / 0{caseStudies.length} · {study.context} experience
            </p>
            <div className="case-dialog__nav">
              <button type="button" className="icon-btn" onClick={() => onNavigate(prev.slug)}>
                <Icon name="chevronL" />
                <span className="visually-hidden">Previous case study: {prev.title}</span>
              </button>
              <button type="button" className="icon-btn" onClick={() => onNavigate(next.slug)}>
                <Icon name="chevronR" />
                <span className="visually-hidden">Next case study: {next.title}</span>
              </button>
              <button type="button" className="icon-btn icon-btn--close" onClick={onClose}>
                <Icon name="close" />
                <span className="visually-hidden">Close case study</span>
              </button>
            </div>
          </div>

          <header className="case-dialog__head">
            <h2 id="case-dialog-title" className="case-dialog__title">
              {study.title}
            </h2>
            <p className="case-dialog__problem">{study.problem}</p>
            <ul className="case-card__tech" aria-label="Technologies">
              {study.tech.map((t) => (
                <li key={t} className="chip">
                  {t}
                </li>
              ))}
            </ul>
          </header>

          <figure className="case-dialog__media">
            <div className="case-dialog__visual" style={{ viewTransitionName: `case-${study.slug}` }}>
              <CaseVisual study={study} />
            </div>
            <figcaption className="figure-caption">{ILLUSTRATIVE} Synthetic example data.</figcaption>
          </figure>

          <div className="case-dialog__story">
            <Block n="01" title="Context">
              <p>{study.detail.context}</p>
            </Block>
            <Block n="02" title="User need">
              <p>{study.detail.userNeed}</p>
            </Block>
            <Block n="03" title="My contribution">
              <ul className="ticks">
                {study.detail.contribution.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Block>
            <Block n="04" title="Flow and architecture" wide>
              <p className="mono case-dialog__note">Simplified flow, based on the documented scope</p>
              <ol className="flow">
                {study.detail.flow.map((f, i) => (
                  <li key={f.step} className="flow__step">
                    <span className="flow__num mono">{String(i + 1).padStart(2, '0')}</span>
                    <strong>{f.step}</strong>
                    <span>{f.note}</span>
                  </li>
                ))}
              </ol>
            </Block>
            <Block n="05" title="Testing and edge cases">
              <ul className="ticks">
                {study.detail.testing.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Block>
            <Block n="06" title="Delivered capability">
              <p>{study.detail.result}</p>
              <p className="case-dialog__fine">Described as delivered scope — no performance metrics are claimed.</p>
            </Block>
          </div>

          <footer className="case-dialog__foot">
            <button type="button" className="case-dialog__next" onClick={() => onNavigate(next.slug)}>
              <span className="mono">Next case study</span>
              <span className="case-dialog__next-title">
                {next.title} <Icon name="arrow" size={22} />
              </span>
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}

function Block({ n, title, children, wide }: { n: string; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`story-block ${wide ? 'story-block--wide' : ''}`}>
      <h3 className="story-block__title">
        <span className="mono">{n}</span> {title}
      </h3>
      <div className="story-block__body">{children}</div>
    </section>
  );
}
