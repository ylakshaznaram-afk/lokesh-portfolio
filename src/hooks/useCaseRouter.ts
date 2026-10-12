import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { caseStudies } from '../data/content';

const PREFIX = '#work/';
const slugFromHash = () => {
  const h = window.location.hash;
  if (!h.startsWith(PREFIX)) return null;
  const slug = decodeURIComponent(h.slice(PREFIX.length));
  return caseStudies.some((c) => c.slug === slug) ? slug : null;
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
export function useCaseRouter() {
  const [openSlug, setOpenSlug] = useState<string | null>(() => slugFromHash());
  const [morphSlug, setMorphSlug] = useState<string | null>(openSlug);
  const pushed = useRef(false);
  const ignorePop = useRef(false);

  const open = useCallback((slug: string) => {
    // Only morph from the card when it is on screen; otherwise the dialog simply fades in.
    const card = document.getElementById(`case-${slug}-title`)?.closest('article');
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
    const onPop = () => {
      if (ignorePop.current) {
        ignorePop.current = false;
        return;
      }
      const slug = slugFromHash();
      if (slug) {
        setMorphSlug(slug);
        transition(() => setOpenSlug(slug));
      } else {
        pushed.current = false;
        transition(() => setOpenSlug(null));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { openSlug, morphSlug, open, navigate, close };
}
