import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { profile, projects } from '../data/content';

const PREFIX = '#work/';
/** Case-study slugs used by the previous version of the site, so shared links keep working. */
const LEGACY: Record<string, string> = {
  'nlu-it-self-service': 'it-self-service',
  'cmdb-aware-conversations': 'cmdb-service-workflows',
};

export const slugFromHash = () => {
  const h = window.location.hash;
  if (!h.startsWith(PREFIX)) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(h.slice(PREFIX.length));
  } catch {
    return null; // malformed escape, e.g. #work/%
  }
  if (LEGACY[slug]) {
    slug = LEGACY[slug];
    history.replaceState(history.state, '', PREFIX + slug);
  }
  return projects.some((p) => p.slug === slug) ? slug : null;
};

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/** Runs a state update inside a View Transition when supported and motion is allowed. */
function transition(update: () => void) {
  const doc = document as Doc;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduced) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}

/**
 * Case-study dialog state, deep-linkable via `#work/<slug>`.
 * `morphSlug` marks which card shares its visual with the dialog during the
 * view transition, so only one element owns the transition name at a time.
 */
export type CaseRouter = ReturnType<typeof useCaseRouter>;

export function useCaseRouter() {
  // Start closed so the client's first render matches the prerendered HTML; deep links open right after.
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [morphSlug, setMorphSlug] = useState<string | null>(null);
  const pushed = useRef(false);
  const ignorePop = useRef(false);
  const baseTitle = useRef<string | null>(null);
  const openRef = useRef<string | null>(null);
  openRef.current = openSlug;

  const open = useCallback((slug: string) => {
    // Only morph from the card when it is on screen; otherwise the dialog simply fades in.
    const card = document.getElementById(`project-${slug}-title`)?.closest('article');
    const r = card?.getBoundingClientRect();
    const onScreen = !!r && r.bottom > 0 && r.top < window.innerHeight;
    flushSync(() => setMorphSlug(onScreen ? slug : null));
    transition(() => setOpenSlug(slug));
    if (slugFromHash() !== slug) {
      const wasOpen = !!slugFromHash();
      if (wasOpen) history.replaceState(null, '', PREFIX + slug);
      else {
        history.pushState(null, '', PREFIX + slug);
        pushed.current = true;
      }
    }
  }, []);

  /** Switch case study inside the open dialog — no shared-element morph. */
  const navigate = useCallback((slug: string) => {
    setMorphSlug(slug);
    setOpenSlug(slug);
    history.replaceState(null, '', PREFIX + slug);
  }, []);

  const close = useCallback(() => {
    // Morph back into the card only when it is on screen (after Previous/Next it may not be).
    const card = openRef.current ? document.getElementById(`project-${openRef.current}-title`)?.closest('article') : null;
    const r = card ? card.getBoundingClientRect() : null;
    const onScreen = !!r && r.bottom > 0 && r.top < window.innerHeight;
    flushSync(() => setMorphSlug(onScreen ? openRef.current : null));
    transition(() => setOpenSlug(null));
    if (slugFromHash()) {
      if (pushed.current) {
        pushed.current = false;
        ignorePop.current = true;
        history.back();
      } else {
        history.replaceState(null, '', '#work');
      }
    }
  }, []);

  useEffect(() => {
    baseTitle.current ??= document.title;
    const project = openSlug ? projects.find((p) => p.slug === openSlug) : undefined;
    document.title = project ? `${project.title} — Case study — ${profile.name}` : baseTitle.current;
  }, [openSlug]);

  useEffect(() => {
    const initial = slugFromHash();
    if (initial) {
      setMorphSlug(initial);
      setOpenSlug(initial);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false;
        return;
      }
      const slug = slugFromHash();
      if (slug) {
        if (slug === openRef.current) return;
        setMorphSlug(slug);
        transition(() => setOpenSlug(slug));
      } else if (openRef.current || document.querySelector('dialog.case[open]')) {
        pushed.current = false;
        transition(() => setOpenSlug(null));
        // A section hash (e.g. #experience) reached via history: scroll once the dialog has released the page.
        const id = window.location.hash.slice(1);
        if (id && id !== 'work') requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
      }
      // Plain in-page links (#work, #contact…) also fire popstate; the browser already scrolls to them.
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { openSlug, morphSlug, open, navigate, close };
}
