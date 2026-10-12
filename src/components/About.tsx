import { certifications, education } from '../data/content';

export function About() {
  return (
    <section className="section about" id="about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__lead">
          <p className="kicker">About</p>
          <h2 id="about-title" className="about__title">
            The developer behind the dialogue.
          </h2>
        </div>
        <div className="about__text reveal">
          <p className="about__statement">
            Most enterprise requests start with a simple question — <em>can I get access?</em> <em>where’s my ticket?</em>{' '}
            <em>how do I take leave?</em> — and cross several systems before anyone gets an answer.
          </p>
          <p>
            I work on both sides of that gap. As a ServiceNow developer I build the applications, workflows and integrations underneath. As a
            conversational designer I shape what people actually see: the prompt, the clarifying question, the fallback when the bot doesn’t
            understand, and the handoff when a person should take over.
          </p>
          <p>The aim is always the same: let the platform carry the complexity, so the conversation doesn’t have to.</p>
        </div>
        <div className="about__creds reveal">
          <div className="about__group">
            <h3 className="mono">Education</h3>
            <dl>
              {education.map((e) => (
                <div key={e.degree}>
                  <dt>{e.degree}</dt>
                  <dd>{e.school}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="about__group">
            <h3 className="mono">Certification</h3>
            <dl>
              {certifications.map((c) => (
                <div key={c.name}>
                  <dt>{c.name}</dt>
                  <dd>{c.issuer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
