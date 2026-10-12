import { useState } from 'react';
import { ribbonStages } from '../../data/content';
import { Visual3D } from '../Visual3D';

type StageId = (typeof ribbonStages)[number]['id'];

/**
 * Featured project visual: the Workflow Ribbon with accessible stage
 * controls, one explanation for the selected stage, and a small
 * illustrative conversation panel (sample data).
 */
export function RibbonFeature({ alt, morphName }: { alt: string; morphName?: string }) {
  const [selected, setSelected] = useState<StageId | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const stage = ribbonStages.find((s) => s.id === selected) ?? null;
  const sample = (stage ?? ribbonStages[0]).sample;
  const toggle = (id: string) => setSelected((cur) => (cur === id ? null : (id as StageId)));

  return (
    <div className="feature feature--ribbon">
      <div className="project__visual" style={{ viewTransitionName: morphName }}>
        <Visual3D
          scene="ribbon"
          alt={alt}
          sizes="(min-width: 1024px) 56vw, 92vw"
          squareMedia="(min-width: 1024px)"
          hotspots={ribbonStages}
          hotspotStyle="control"
          selected={selected}
          hovered={hovered}
          onSelect={toggle}
          onHover={setHovered}
        >
          <div className="mini-chat" aria-hidden="true">
            <span className="mini-chat__head">
              <i /> Virtual Agent
            </span>
            <p className={`mini-chat__line mini-chat__line--${sample.from}`} key={sample.text}>
              {sample.text}
            </p>
          </div>
        </Visual3D>
      </div>
      <p className="caption feature__caption">Illustrative · sample data</p>

      <div className="stages" role="group" aria-label="Workflow stages">
        {ribbonStages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="stages__btn"
            aria-pressed={selected === s.id}
            aria-controls="ribbon-explainer"
            onClick={() => toggle(s.id)}
            onPointerEnter={() => setHovered(s.id)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.id)}
            onBlur={() => setHovered(null)}
          >
            <span className="stages__num">0{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>
      <p id="ribbon-explainer" className="stages__text" aria-live="polite">
        {stage ? (
          <>
            <strong>{stage.label}.</strong> {stage.text}
          </>
        ) : (
          'Select a stage to follow a request from first message to resolved record.'
        )}
      </p>
    </div>
  );
}
