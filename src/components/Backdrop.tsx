import { useEffect, useRef } from 'react';

/** Long, quiet "conversation threads" with a light travelling along each one. */
const THREADS = [
  'M-80 720C260 600 560 840 900 650S1380 420 1540 380',
  'M-80 250C260 170 540 350 840 260S1320 110 1540 170',
  'M180 980C420 770 760 790 1010 560S1320 300 1540 250',
];

/**
 * Ambient page background, fixed behind everything: drifting aurora light in
 * the brand colours, a fine dot grid that fades towards the edges, three faint
 * light threads, and a soft spotlight that follows the mouse. Pure CSS/SVG (no
 * WebGL), decorative only, and still when reduced motion is preferred.
 */
export function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      el.style.setProperty('--spot-x', `${x}px`);
      el.style.setProperty('--spot-y', `${y}px`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !fine.matches || reduced.matches) return;
      x = e.clientX;
      y = e.clientY;
      el.dataset.spot = 'on';
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => delete el.dataset.spot;
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="backdrop" aria-hidden="true">
      <div className="backdrop__aurora backdrop__aurora--a" />
      <div className="backdrop__aurora backdrop__aurora--b" />
      <div className="backdrop__aurora backdrop__aurora--c" />
      <div className="backdrop__grid" />
      <svg className="backdrop__threads" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {THREADS.map((d, i) => (
          <g key={d}>
            <path className="backdrop__thread" d={d} />
            <path className={`backdrop__pulse backdrop__pulse--${i + 1}`} d={d} pathLength={1000} />
          </g>
        ))}
      </svg>
      <div className="backdrop__spot" />
    </div>
  );
}
