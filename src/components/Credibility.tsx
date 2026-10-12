import { highlights } from '../data/content';

/** A quiet, hairline-divided strip of evidence — not another row of cards. */
export function Credibility() {
  return (
    <section className="cred" aria-label="Highlights">
      <div className="container">
        <ul className="cred__strip">
          {highlights.map((h, i) => (
            <li key={h.id} className={`cred__item cred__item--${h.id} reveal`} style={{ ['--i' as string]: i }}>
              <span className="cred__value">{h.value}</span>
              <span className="cred__label">{h.label}</span>
              <span className="cred__note">{h.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
