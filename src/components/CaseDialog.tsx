import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { art } from '../assets/visuals/art';
import { projects, type Project } from '../data/content';
import { Icon } from './Icon';
import { CaseVisual } from './visuals';
import { JourneyVisual } from './work/JourneyVisual';
import { PanelsVisual } from './work/PanelsVisual';

interface Props {
  slug: string | null;
  onClose: () => void;
  onNavigate: (slug: string) => void;
}

/** Large visual at the top of a case study — the same artwork family as the card. */
function LeadVisual({ project }: { project: Project }) {
  if (project.visual === 'panels') return <PanelsVisual label={project.visualAlt} large />;
  if (project.visual === 'journey') return <JourneyVisual label={project.visualAlt} large />;
  const a = project.visual === 'ribbon' ? (art.ribbon.wide ?? art.ribbon.main) : art.constellation.main;
  return (
    <img
      className="case__lead-img"
      src={a.src}
      srcSet={a.srcSet}
      sizes="(min-width: 1180px) 1080px, 94vw"
      width={a.width}
      height={a.height}
      alt={project.visualAlt}
      decoding="async"
    />
  );
}

export function CaseDialog({ slug, onClose, onNavigate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSlug = useRef<string | null>(null);
  const index = projects.findIndex((p) => p.slug === slug);
  const project = index >= 0 ? projects[index] : null;

  // Layout effect so showModal() happens inside the view-transition update.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (project && !d.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      d.showModal();
      document.documentElement.classList.add('is-locked');
      d.querySelector<HTMLElement>('.icon-btn--close')?.focus();
    } else if (!project && d.open) {
      d.close();
      document.documentElement.classList.remove('is-locked');
      const target = returnFocus.current;
      if (target && target !== document.body && document.contains(target)) {
        target.focus({ preventScroll: true });
      } else {
        // Opened from a direct link: return the reader to that project's card.
        const card = lastSlug.current ? document.getElementById(`project-${lastSlug.current}-title`)?.closest('article') : null;
        card?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        card?.querySelector<HTMLElement>('.project__cta')?.focus({ preventScroll: true });
      }
    }
  }, [project]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    // Previous/Next inside the open dialog: move focus to the new title so it is announced and visible.
    if (slug && lastSlug.current && lastSlug.current !== slug) document.getElementById('case-title')?.focus({ preventScroll: true });
    if (slug) lastSlug.current = slug;
  }, [slug]);

  useEffect(() => () => document.documentElement.classList.remove('is-locked'), []);

  const prev = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const cs = project?.caseStudy;

  return (
    <dialog
      ref={ref}
      className="case"
      aria-labelledby="case-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {project && cs && (
        <div className="case__sheet" ref={scrollRef}>
          <div className="case__bar">
            <p className="mono">
              {project.index} / 0{projects.length} · {project.employer}
            </p>
            <div className="case__nav">
              <button type="button" className="icon-btn" onClick={() => onNavigate(prev.slug)}>
                <Icon name="chevronL" />
                <span className="visually-hidden">Previous project: {prev.title}</span>
              </button>
              <button type="button" className="icon-btn" onClick={() => onNavigate(next.slug)}>
                <Icon name="chevronR" />
                <span className="visually-hidden">Next project: {next.title}</span>
              </button>
              <button type="button" className="icon-btn icon-btn--close" onClick={onClose}>
                <Icon name="close" />
                <span className="visually-hidden">Close case study</span>
              </button>
            </div>
          </div>

          <div className="case__head">
            <p className="kicker">Case study</p>
            <h2 id="case-title" className="case__title" tabIndex={-1}>
              {project.title}
            </h2>
            <p className="case__summary">{project.summary}</p>
          </div>

          <figure className="case__lead">
            <div className="case__lead-frame" style={{ viewTransitionName: `case-${project.slug}` }}>
              <LeadVisual project={project} />
            </div>
            {(project.visual === 'panels' || project.visual === 'journey') && (
              <figcaption className="caption">Illustrative interface · sample data</figcaption>
            )}
          </figure>

          <div className="case__body">
            <Block title="Overview">
              <p>{cs.overview}</p>
            </Block>
            <Block title="Challenge">
              <p>{cs.challenge}</p>
            </Block>
            <Block title="My role">
              <ul className="ticks">
                {cs.role.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Block>
            <Block title="Approach">
              <p>{cs.approach}</p>
            </Block>
            <Block title="Implementation" wide>
              <ol className="flow">
                {cs.implementation.map((f, i) => (
                  <li key={f.step} className="flow__step">
                    <span className="flow__num mono">{String(i + 1).padStart(2, '0')}</span>
                    <strong>{f.step}</strong>
                    <span>{f.note}</span>
                  </li>
                ))}
              </ol>
              <figure className="case__figure">
                <div className="case__figure-frame">
                  <CaseVisual project={project} />
                </div>
                <figcaption className="caption">Illustrative interface · sample data</figcaption>
              </figure>
              <ul className="case__stack" aria-label="Technologies">
                {cs.stack.map((t) => (
                  <li key={t} className="tag">
                    {t}
                  </li>
                ))}
              </ul>
            </Block>
            {cs.testing.length > 0 && (
              <Block title="Testing & edge cases">
                <ul className="ticks">
                  {cs.testing.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </Block>
            )}
            <Block title="Delivered capabilities">
              <ul className="ticks">
                {cs.delivered.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Block>
          </div>

          <div className="case__foot">
            <button type="button" className="case__next" onClick={() => onNavigate(next.slug)}>
              <span className="mono">Next project</span>
              <span className="case__next-title">
                {next.title} <Icon name="arrow" size={24} />
              </span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Block({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`case__block ${wide ? 'case__block--wide' : ''}`}>
      <h3 className="case__block-title">{title}</h3>
      <div className="case__block-body">{children}</div>
    </section>
  );
}
