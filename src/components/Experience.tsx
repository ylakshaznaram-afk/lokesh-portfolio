import { experience } from '../data/content';

export function Experience() {
  return (
    <section className="section experience" id="experience" aria-labelledby="experience-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow section-head__eyebrow">Experience</p>
          <h2 id="experience-title" className="section-head__title">
            A career on the ServiceNow platform.
          </h2>
          <p className="section-head__lead">Roles and dates as listed on my resume, most recent first.</p>
        </header>
        <ol className="timeline">
          {experience.map((r, i) => (
            <li key={r.company} className="timeline__item reveal" style={{ ['--i' as string]: i }}>
              <div className="timeline__when">
                <p className="mono">
                  <time>{r.start}</time> – <time>{r.end}</time>
                </p>
              </div>
              <div className="timeline__marker" aria-hidden="true">
                <span className={i === 0 ? 'is-current' : ''} />
              </div>
              <div className="timeline__body">
                <h3 className="timeline__company">{r.company}</h3>
                <p className="timeline__title">{r.title}</p>
                {r.points.length > 0 && (
                  <ul className="timeline__points">
                    {r.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
