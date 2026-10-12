import { useEffect, useRef } from 'react';
import { profile, projects, type Project } from '../data/content';
import { Icon } from './Icon';
import { ConstellationFeature } from './work/ConstellationFeature';
import { JourneyVisual } from './work/JourneyVisual';
import { PanelsVisual } from './work/PanelsVisual';
import { RibbonFeature } from './work/RibbonFeature';

interface Props {
  morphSlug: string | null;
  openSlug: string | null;
  onOpen: (slug: string) => void;
}

const LAYOUT: Record<Project['visual'], 'featured' | 'medium' | 'wide'> = {
  ribbon: 'featured',
  panels: 'medium',
  constellation: 'medium',
  journey: 'wide',
};

/**
 * Pointer-tracked depth for the project visuals: the CSS 3D compositions turn
 * toward the pointer and a soft sheen follows it. Fine pointers only, and
 * nothing at all when reduced motion is preferred.
 */
function usePointerDepth() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const capable = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let active: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      if (!active) return;
      const r = active.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (x - r.left) / r.width));
      const ny = Math.max(0, Math.min(1, (y - r.top) / r.height));
      active.style.setProperty('--tilt-x', (nx * 2 - 1).toFixed(3));
      active.style.setProperty('--tilt-y', (ny * 2 - 1).toFixed(3));
      active.style.setProperty('--sheen-x', `${(nx * 100).toFixed(1)}%`);
      active.style.setProperty('--sheen-y', `${(ny * 100).toFixed(1)}%`);
    };
    const release = () => {
      if (!active) return;
      active.classList.remove('is-tilting');
      for (const v of ['--tilt-x', '--tilt-y']) active.style.removeProperty(v);
      active = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !capable.matches || reduced.matches) return;
      const el = (e.target as Element).closest<HTMLElement>('.project__visual');
      if (el !== active) {
        release();
        active = el;
        active?.classList.add('is-tilting');
      }
      x = e.clientX;
      y = e.clientY;
      if (active && !frame) frame = requestAnimationFrame(apply);
    };
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', release);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', release);
    };
  }, []);
  return ref;
}

export function Work({ morphSlug, openSlug, onOpen }: Props) {
  const bentoRef = usePointerDepth();
  return (
    <section className="section work" id="work" aria-labelledby="work-title">
      <div className="container">
        <header className="section-head">
          <p className="kicker">Selected work</p>
          <h2 id="work-title" className="section-head__title">
            {profile.slogan[0]}
            <br />
            <em className="accent">{profile.slogan[1]}</em>
          </h2>
          <p className="section-head__lead">Four projects from my ServiceNow roles at Deloitte, SenecaGlobal and Cognizant.</p>
        </header>

        <div className="work__bento" ref={bentoRef}>
          {projects.map((p, i) => (
            <ProjectCard
              key={p.slug}
              project={p}
              layout={LAYOUT[p.visual]}
              index={i}
              morph={morphSlug === p.slug && openSlug !== p.slug}
              onOpen={() => onOpen(p.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({
  project: p,
  layout,
  index,
  morph,
  onOpen,
}: {
  project: Project;
  layout: 'featured' | 'medium' | 'wide';
  index: number;
  morph: boolean;
  onOpen: () => void;
}) {
  const titleId = `project-${p.slug}-title`;
  const morphName = morph ? `case-${p.slug}` : undefined;

  let visual;
  if (p.visual === 'ribbon') visual = <RibbonFeature alt={p.visualAlt} morphName={morphName} />;
  else if (p.visual === 'constellation') visual = <ConstellationFeature alt={p.visualAlt} morphName={morphName} />;
  else
    visual = (
      <div className="feature">
        <div className="project__visual project__visual--clickable" style={{ viewTransitionName: morphName }} onClick={onOpen}>
          {p.visual === 'panels' ? <PanelsVisual label={p.visualAlt} /> : <JourneyVisual label={p.visualAlt} />}
        </div>
        <p className="caption feature__caption">Illustrative interface · sample data</p>
      </div>
    );

  return (
    <article className={`project project--${layout} project--${p.visual} reveal`} style={{ ['--i' as string]: index }} aria-labelledby={titleId}>
      {visual}
      <div className="project__body">
        <p className="project__meta mono">
          <span className="project__index">{p.index}</span>
          {p.employer}
        </p>
        <h3 id={titleId} className="project__title">
          {p.title}
        </h3>
        <p className="project__summary">{p.summary}</p>
        <div className="project__foot">
          <ul className="project__tags" aria-label="Technologies">
            {p.tags.slice(0, 3).map((t) => (
              <li key={t} className="tag">
                {t}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--ghost btn--sm project__cta" onClick={onOpen} aria-describedby={titleId}>
            Explore case study <Icon name="arrow" className="icon-arrow" />
          </button>
        </div>
      </div>
    </article>
  );
}
