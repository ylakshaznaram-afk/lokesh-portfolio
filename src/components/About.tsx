import { certifications, education } from '../data/content';

export function About() {
  return (
    <section className="section about" id="about" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__art reveal" aria-hidden="true">
          <AboutArt />
        </div>
        <div className="about__copy">
          <p className="eyebrow">About</p>
          <h2 id="about-title" className="about__title">
            The developer behind the dialogue.
          </h2>
          <div className="about__text">
            <p>
              Most enterprise requests start with a simple question — <em>“can I get access?”</em>, <em>“where’s my ticket?”</em>,{' '}
              <em>“how do I take leave?”</em> — and end up crossing several systems before anyone gets an answer.
            </p>
            <p>
              I work on both sides of that gap. As a ServiceNow developer I build the applications, workflows and integrations underneath; as a
              conversational designer I shape what people actually see: the prompt, the clarifying question, the fallback when the bot doesn’t
              understand, and the handoff when a person should take over.
            </p>
            <p>The goal is the same every time: let the platform carry the complexity, so the conversation doesn’t have to.</p>
          </div>
        </div>

        <div className="about__creds">
          <div className="card about__card reveal">
            <h3 className="mono">Education</h3>
            <ul>
              {education.map((e) => (
                <li key={e.degree}>
                  <p className="about__degree">{e.degree}</p>
                  <p className="about__school">{e.school}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="card about__card reveal">
            <h3 className="mono">Certification</h3>
            <ul>
              {certifications.map((c) => (
                <li key={c.name}>
                  <p className="about__degree">{c.name}</p>
                  <p className="about__school">{c.issuer}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Abstract monogram composition — the LG mark built from engine modules. */
function AboutArt() {
  return (
    <svg viewBox="0 0 400 440" className="about__svg">
      <defs>
        <linearGradient id="ab-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6dce6" />
          <stop offset="0.45" stopColor="#6f7888" />
          <stop offset="1" stopColor="#aab3c0" />
        </linearGradient>
        <radialGradient id="ab-glow" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#67E8F9" stopOpacity="0.14" />
          <stop offset="1" stopColor="#67E8F9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="440" rx="28" fill="#0c1017" stroke="rgba(255,255,255,0.08)" />
      <rect width="400" height="440" rx="28" fill="url(#ab-glow)" />
      {/* L made of modules */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={`l${i}`} x="70" y={90 + i * 62} width="62" height="48" rx="12" fill="#11151d" stroke="rgba(255,255,255,0.14)" />
      ))}
      <rect x="146" y="276" width="62" height="48" rx="12" fill="#11151d" stroke="rgba(255,255,255,0.14)" />
      <rect x="70" y="90" width="62" height="48" rx="12" fill="url(#ab-metal)" opacity="0.9" />
      {/* G as a conversation loop */}
      <path d="M318 150a70 70 0 1 0 0 104v-44h-46" fill="none" stroke="#67E8F9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M101 114 C 180 70, 260 90, 300 134" fill="none" stroke="rgba(167,139,250,0.55)" strokeWidth="1.5" strokeDasharray="3 6" />
      <circle cx="272" cy="210" r="7" fill="#67E8F9" />
      <circle cx="101" cy="114" r="5" fill="#0c1017" stroke="#A78BFA" strokeWidth="2" />
      <text x="32" y="404" className="eg-code">
        LG · CONVERSATION ENGINE
      </text>
    </svg>
  );
}
