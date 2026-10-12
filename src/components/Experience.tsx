import { experience } from '../data/content';

export function Experience() {
  return (
    <section className="section experience" id="experience" aria-labelledby="experience-title">
      <div className="container">
        <header className="section-head">
          <p className="kicker">Experience</p>
          <h2 id="experience-title" className="section-head__title">
            A career on the <em className="accent">ServiceNow platform.</em>
          </h2>
        </header>
        <ol className="career">
          {experience.map((r, i) => (
            <li key={r.company} className={`career__item reveal ${i === 0 ? 'career__item--current' : ''}`} style={{ ['--i' as string]: i }}>
              <p className="career__when mono">
                <time>{r.start}</time>
                <span aria-hidden="true"> — </span>
                <span className="visually-hidden"> to </span>
                <time>{r.end}</time>
              </p>
              <div className="career__who">
                <h3 className="career__company">{r.company}</h3>
                <p className="career__title">{r.title}</p>
              </div>
              {r.points.length > 0 && (
                <ul className="career__points">
                  {r.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
