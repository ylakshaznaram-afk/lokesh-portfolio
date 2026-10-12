import { useEffect, useRef, type CSSProperties } from 'react';
import { profile } from '../data/content';
import { Icon } from './Icon';
import { Visual3D } from './Visual3D';

/** One span per letter (selectable text; the h1 keeps the plain name for assistive tech). */
function Letters({ text, from }: { text: string; from: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className="hero__char" style={{ '--i': from + i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </>
  );
}

/**
 * Letters near the mouse lift slightly and pick up a mint tint (--p, 0…1,
 * transitioned in CSS). Fine pointers only; nothing with reduced motion.
 */
function useLetterField() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const h1 = ref.current;
    const zone = h1?.closest('section');
    if (!h1 || !zone) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const chars = [...h1.querySelectorAll<HTMLElement>('.hero__char')];
    let centers: { x: number; y: number }[] = [];
    let radius = 1;
    let frame = 0;
    let px = 0;
    let py = 0;
    const measure = () => {
      centers = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY };
      });
      radius = parseFloat(getComputedStyle(h1).fontSize) * 1.25;
    };
    const apply = () => {
      frame = 0;
      chars.forEach((c, i) => {
        const d = Math.hypot(centers[i].x - px, centers[i].y - py);
        const p = Math.max(0, 1 - d / radius);
        c.style.setProperty('--p', (p * p * (3 - 2 * p)).toFixed(3));
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !fine.matches || reduced.matches) return;
      if (!centers.length) measure();
      px = e.clientX + scrollX;
      py = e.clientY + scrollY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => chars.forEach((c) => c.style.setProperty('--p', '0'));
    const reset = () => (centers = []);
    zone.addEventListener('pointermove', onMove, { passive: true });
    zone.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', reset);
    document.fonts?.ready.then(reset);
    return () => {
      cancelAnimationFrame(frame);
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', reset);
    };
  }, []);
  return ref;
}

const PRISM_SPOTS = [
  { id: 'request', label: 'Request' },
  { id: 'answer', label: 'Answer' },
] as const;

export function Hero() {
  const nameRef = useLetterField();
  const [first, last] = profile.nameLines;
  return (
    <section className="hero" id="top" aria-labelledby="hero-name">
      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 id="hero-name" className="hero__name" aria-label={profile.name} ref={nameRef}>
            <span className="hero__line">
              <Letters text={first} from={0} />
            </span>{' '}
            <span className="hero__line">
              <Letters text={last} from={first.length} />
            </span>
          </h1>
        </div>

        <div className="hero__detail">
          <p className="hero__role">
            <span className="role-chip role-chip--dev">{profile.roles[0]}</span>
            <span className="role-pair">
              <span className="role-link">
                {' '}
                <span className="role-link__amp">&amp;</span>{' '}
              </span>
              <span className="role-chip role-chip--design">{profile.roles[1]}</span>
            </span>
          </p>
          <p className="hero__intro">{profile.intro}</p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#work">
              Explore my work <Icon name="arrow" className="icon-arrow" />
            </a>
            <a className="btn btn--ghost" href="#contact">
              Get in touch
            </a>
            {profile.resumeUrl && (
              <a className="btn btn--ghost" href={profile.resumeUrl} download>
                <Icon name="download" /> Resume
              </a>
            )}
          </div>
        </div>

        <div className="hero__visual">
          <Visual3D
            scene="prism"
            hint="Drag to turn · tap to send"
            priority
            sizes="(min-width: 1024px) 40vw, (min-width: 768px) 44vw, 88vw"
            alt="Dialogue Prism: a smoked-glass form and a satin-metal form joined by a luminous channel — a request becoming a clear answer."
            hotspots={PRISM_SPOTS}
          />
        </div>

        <ul className="hero__focus" aria-label="Focus areas">
          {profile.focus.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
