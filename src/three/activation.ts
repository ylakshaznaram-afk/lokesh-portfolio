/**
 * Only one sculpture renders at a time. Each live visual registers its
 * element; the one occupying the most of the viewport becomes active and
 * every other scene pauses. Nothing runs while a modal covers the page.
 */
type Listener = (active: boolean) => void;

interface Entry {
  el: Element;
  ratio: number;
  listener: Listener;
  active: boolean;
}

const entries = new Map<Element, Entry>();
let io: IntersectionObserver | null = null;
let mo: MutationObserver | null = null;

const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);
const MIN_RATIO = 0.12;

function covered() {
  return document.documentElement.classList.contains('is-locked') || document.hidden;
}

function recompute() {
  let best: Entry | null = null;
  if (!covered()) {
    for (const e of entries.values()) {
      if (e.ratio >= MIN_RATIO && (!best || e.ratio > best.ratio)) best = e;
    }
  }
  for (const e of entries.values()) {
    const next = e === best;
    if (next !== e.active) {
      e.active = next;
      e.listener(next);
    }
  }
}

function ensureObservers() {
  if (io) return;
  io = new IntersectionObserver(
    (records) => {
      for (const r of records) {
        const e = entries.get(r.target);
        if (e) e.ratio = r.isIntersecting ? r.intersectionRatio : 0;
      }
      recompute();
    },
    { threshold: THRESHOLDS },
  );
  mo = new MutationObserver(recompute);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', recompute);
}

export function registerVisual(el: Element, listener: Listener) {
  ensureObservers();
  const entry: Entry = { el, ratio: 0, listener, active: false };
  entries.set(el, entry);
  io!.observe(el);
  return () => {
    io?.unobserve(el);
    entries.delete(el);
    if (entry.active) recompute();
    if (!entries.size) {
      io?.disconnect();
      mo?.disconnect();
      document.removeEventListener('visibilitychange', recompute);
      io = null;
      mo = null;
    }
  };
}
