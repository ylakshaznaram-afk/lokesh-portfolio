/**
 * IT Self-Service visual: dimensional conversation panels in front of an
 * intent tree. Pure HTML/CSS 3D (no WebGL), synthetic sample data.
 */
export function PanelsVisual({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <div className={`panels ${large ? 'panels--large' : ''}`} role="img" aria-label={label}>
      <div className="panels__scene" aria-hidden="true">
        <div className="panels__layer panels__layer--tree">
          <span className="panels__eyebrow">Intent map</span>
          <svg viewBox="0 0 320 190" className="panels__tree">
            <path d="M48 95 C 90 95, 90 38, 132 38 M48 95 H132 M48 95 C 90 95, 90 152, 132 152" />
            <path className="dim" d="M228 38 C 250 38, 250 20, 268 20 M228 38 C 250 38, 250 56, 268 56 M228 95 H268 M228 152 C 250 152, 250 134, 268 134 M228 152 C 250 152, 250 170, 268 170" />
            <circle cx="48" cy="95" r="6" className="node node--root" />
          </svg>
          <span className="panels__intent" style={{ top: '13%' }}>password_reset</span>
          <span className="panels__intent" style={{ top: '43%' }}>access_request</span>
          <span className="panels__intent" style={{ top: '73%' }}>outage_notice</span>
        </div>

        <div className="panels__layer panels__layer--chat">
          <div className="panels__head">
            <i /> IT Support
          </div>
          <p className="bubble bubble--user" data-state="request">
            I can’t sign in
          </p>
          <p className="bubble bubble--bot" data-state="clarify">
            Is it your main work account, or one app?
          </p>
          <p className="bubble bubble--user">Main account</p>
        </div>

        <div className="panels__layer panels__layer--resolve">
          <p className="bubble bubble--bot" data-state="resolve">
            Here are the self-service reset steps.
          </p>
          <span className="panels__pill" data-state="handoff">
            Connect to an agent
          </span>
        </div>
      </div>
    </div>
  );
}
