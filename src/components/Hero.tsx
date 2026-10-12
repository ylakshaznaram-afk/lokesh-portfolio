import { profile } from '../data/content';
import { Icon } from './Icon';
import { Visual3D } from './Visual3D';

const PRISM_SPOTS = [
  { id: 'request', label: 'Request' },
  { id: 'answer', label: 'Answer' },
] as const;

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-name">
      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 id="hero-name" className="hero__name">
            <span className="hero__line">{profile.nameLines[0]}</span>{' '}
            <span className="hero__line">{profile.nameLines[1]}</span>
          </h1>
        </div>

        <div className="hero__detail">
          <p className="hero__role">{profile.role}</p>
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
