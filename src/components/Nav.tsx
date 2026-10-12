import { useEffect, useRef, useState } from 'react';
import { navItems, profile } from '../data/content';
import { useActiveSection } from '../hooks/useActiveSection';
import { Icon } from './Icon';

const ids = navItems.map((n) => n.id);

export function Nav() {
  const active = useActiveSection(ids);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile menu: Escape closes, focus moves into the panel and returns to the toggle.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === 'Tab' && panel) {
        const items = [toggleRef.current, ...panel.querySelectorAll<HTMLElement>('a')].filter(Boolean) as HTMLElement[];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onResize = () => window.innerWidth > 820 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <nav className="nav__bar" aria-label="Primary">
        <a href="#top" className="nav__mark" aria-label={`${profile.name} — back to top`}>
          <Monogram />
        </a>
        <ul className="nav__links">
          {navItems
            .filter((n) => n.id !== 'contact')
            .map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="nav__link" aria-current={active === n.id ? 'location' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
        </ul>
        <a href="#contact" className="btn btn--primary btn--sm nav__cta" aria-current={active === 'contact' ? 'location' : undefined}>
          Contact
        </a>
        <button
          ref={toggleRef}
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
          <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </nav>
      <div id="mobile-menu" ref={panelRef} className="nav__panel" hidden={!open}>
        <ul>
          {navItems.map((n, i) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                aria-current={active === n.id ? 'location' : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="mono">0{i + 1}</span>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

export function Monogram({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="monogram">
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="11" fill="#11151D" stroke="rgba(255,255,255,0.14)" />
      <path d="M11 11v18h8" fill="none" stroke="#F4F7FB" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M30.6 15.4A6.5 6.5 0 1 0 30.6 24.6V21H26"
        fill="none"
        stroke="#67E8F9"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
