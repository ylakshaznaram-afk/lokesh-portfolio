import { useEffect } from 'react';

/**
 * Adds `.is-in` to `.reveal` elements as they approach the viewport.
 * Triggers 15% ahead of the fold so content is settled by the time it is read.
 * Without JS or with reduced motion, `.reveal` has no effect (see base.css).
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    root.classList.add('motion-ok');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px 15% 0px' },
    );
    const observe = () => document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => io.observe(el));
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('motion-ok');
    };
  }, []);
}
