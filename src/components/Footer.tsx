import { profile } from '../data/content';
import { Monogram } from './Nav';

export function Footer() {
  return (
    <footer className="footer container">
      <div className="footer__row">
        <Monogram size={28} />
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <p className="mono footer__note">Visuals are illustrative and use synthetic data. Demo is a local simulation.</p>
        <a href="#top" className="footer__top">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
