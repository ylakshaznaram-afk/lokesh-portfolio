/**
 * Employee Center visual: layered employee-service interfaces arranged along
 * a journey. Pure HTML/CSS 3D (no WebGL), synthetic sample data.
 */
const STEPS = ['Submitted', 'Routed', 'In review', 'Completed'];

export function JourneyVisual({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <div className={`journey ${large ? 'journey--large' : ''}`} role="img" aria-label={label}>
      <div className="journey__scene" aria-hidden="true">
        <svg className="journey__path" viewBox="0 0 1000 400" preserveAspectRatio="none">
          <path d="M60 330 C 260 330, 260 250, 420 230 S 700 120, 940 70" />
        </svg>

        <div className="journey__card journey__card--1">
          <span className="journey__eyebrow">01 · Choose</span>
          <div className="journey__tiles">
            <span data-on="true">Leave</span>
            <span>Payroll</span>
            <span>Documents</span>
            <span>Joining &amp; leaving</span>
          </div>
        </div>

        <div className="journey__card journey__card--2">
          <span className="journey__eyebrow">02 · Clarify</span>
          <p className="journey__q">Planned or unplanned leave?</p>
          <div className="journey__opts">
            <span data-on="true">Planned</span>
            <span>Unplanned</span>
          </div>
        </div>

        <div className="journey__card journey__card--3">
          <span className="journey__eyebrow">03 · Route</span>
          <p className="journey__q">Leave request</p>
          <p className="journey__meta">Routed to the Leave team</p>
        </div>

        <div className="journey__card journey__card--4">
          <span className="journey__eyebrow">04 · Track</span>
          <ol className="journey__steps">
            {STEPS.map((s, i) => (
              <li key={s} data-state={i < 2 ? 'done' : i === 2 ? 'current' : undefined}>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
