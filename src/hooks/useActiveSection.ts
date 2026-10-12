import { useEffect, useState } from 'react';

/** Returns the id of the section currently occupying the reading line (~35% from top). */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    const observed = new Set<string>();
    const attach = () => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && !observed.has(id)) {
          observed.add(id);
          io.observe(el);
        }
      }
      if (observed.size === ids.length) mo.disconnect();
    };
    // Sections below the fold mount after first paint; pick them up as they appear.
    const mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });
    attach();
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.4) setActive(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids]);
  return active;
}
