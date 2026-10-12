import { caseStudies, type CaseStudy } from '../data/content';
import { useTilt } from '../hooks/useTilt';
import { Icon } from './Icon';
import { CaseVisual, ILLUSTRATIVE } from './visuals';

interface Props {
  morphSlug: string | null;
  openSlug: string | null;
  onOpen: (slug: string) => void;
}

export function Work({ morphSlug, openSlug, onOpen }: Props) {
  return (
    <section className="section work" id="work" aria-labelledby="work-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow section-head__eyebrow">Selected work</p>
          <h2 id="work-title" className="section-head__title">
            Conversations built on real enterprise plumbing.
          </h2>
          <p className="section-head__lead">
            Four editorial case studies drawn from my ServiceNow roles. Titles describe the work; they aren’t product names.
          </p>
        </header>
        <div className="work__grid">
          {caseStudies.map((c, i) => (
            <CaseCard
              key={c.slug}
              study={c}
              layout={(['a', 'b', 'c', 'd'] as const)[i]}
              morph={morphSlug === c.slug && openSlug !== c.slug}
              onOpen={() => onOpen(c.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CaseCard({ study, layout, morph, onOpen }: { study: CaseStudy; layout: 'a' | 'b' | 'c' | 'd'; morph: boolean; onOpen: () => void }) {
  const tilt = useTilt<HTMLElement>(2);
  const titleId = `case-${study.slug}-title`;
  return (
    <article ref={tilt} className={`card case-card case-card--${layout} reveal`} aria-labelledby={titleId}>
      <figure className="case-card__media" onClick={onOpen}>
        <div className="case-card__visual" style={{ viewTransitionName: morph ? `case-${study.slug}` : undefined }}>
          <CaseVisual study={study} />
        </div>
        <figcaption className="figure-caption">{ILLUSTRATIVE}</figcaption>
      </figure>
      <div className="case-card__body">
        <p className="mono case-card__meta">
          <span>{study.index}</span>
          <span aria-hidden="true">/</span>
          <span>{study.context} experience</span>
        </p>
        <h3 id={titleId} className="case-card__title">
          {study.title}
        </h3>
        <p className="case-card__problem">{study.problem}</p>
        <div className="case-card__contrib">
          <p className="mono">My documented contribution</p>
          <ul>
            {study.contribution.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <ul className="case-card__tech" aria-label="Technologies">
          {study.tech.map((t) => (
            <li key={t} className="chip">
              {t}
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--ghost case-card__cta" onClick={onOpen} aria-describedby={titleId}>
          View case study <Icon name="arrow" />
        </button>
      </div>
    </article>
  );
}
