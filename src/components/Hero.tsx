import { profile } from '../data/content';
import { HeroEngine } from '../engine/HeroEngine';
import { Icon } from './Icon';

export function Hero({ onOpenCase }: { onOpenCase: (slug: string) => void }) {
  return (
    <section className="hero container" id="top" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="eyebrow">{profile.eyebrow.join(' • ')}</p>
        <h1 id="hero-title" className="hero__title">
          {profile.headline.map((line, i) => (
            <span key={line} className={`hero__line ${i === 1 ? 'hero__line--accent' : ''}`}>
              {line}
            </span>
          ))}
        </h1>
        <p className="hero__intro">{profile.intro}</p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#work">
            Explore my work <Icon name="arrow" />
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
        <ul className="hero__meta" aria-label="Specializations">
          {profile.specializations.map((s) => (
            <li key={s} className="chip">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="hero__engine">
        <HeroEngine onOpenCase={onOpenCase} />
      </div>
    </section>
  );
}
