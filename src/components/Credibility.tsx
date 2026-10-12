import { highlights } from '../data/content';

export function Credibility() {
  return (
    <section className="cred container" aria-labelledby="cred-title">
      <h2 id="cred-title" className="visually-hidden">
        At a glance
      </h2>
      <ul className="cred__grid">
        {highlights.map((h, i) => (
          <li key={h.id} className={`card cred__item cred__item--${h.id} reveal`} style={{ ['--i' as string]: i }}>
            <span className="mono cred__source">{h.source}</span>
            {h.id === 'topics' && <TopicStrip />}
            {h.items ? (
              <ul className="cred__focus" aria-label={h.label}>
                {h.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            ) : (
              <>
                <p className="cred__value">{h.value}</p>
                <p className="cred__label">{h.label}</p>
                <p className="cred__caption">{h.caption}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Twenty topic blocks and an open slot for the "+" — decorative. */
function TopicStrip() {
  return (
    <svg className="cred__strip" viewBox="0 0 230 40" aria-hidden="true" focusable="false">
      {Array.from({ length: 21 }).map((_, i) => {
        const open = i === 20;
        return (
          <rect
            key={i}
            x={(i % 11) * 21 + 0.5}
            y={i < 11 ? 0.5 : 22.5}
            width="16"
            height="16"
            rx="4"
            fill={open ? 'none' : i % 6 === 3 ? 'rgba(167,139,250,0.38)' : 'rgba(103,232,249,0.24)'}
            stroke={open ? 'rgba(103,232,249,0.6)' : 'rgba(255,255,255,0.06)'}
            strokeDasharray={open ? '3 3' : undefined}
          />
        );
      })}
    </svg>
  );
}
