import { profile } from "../data/content";
import { Monogram } from "./Nav";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__row">
          <a href="#top" className="footer__brand">
            <Monogram size={28} />
            <span>{profile.name}</span>
            <span className="visually-hidden"> — back to top</span>
          </a>
          <p className="footer__copy">© {new Date().getFullYear()}</p>
          <nav className="footer__links" aria-label="Footer">
            <a href={`mailto:${profile.email}`}>Email</a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <a href="#top">Back to top ↑</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
