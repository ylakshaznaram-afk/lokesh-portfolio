import { useState } from 'react';
import { constellationNodes } from '../../data/content';
import { Visual3D } from '../Visual3D';

type NodeId = (typeof constellationNodes)[number]['id'];

/** CMDB project visual: the Service Constellation with component controls and the selected relationship. */
export function ConstellationFeature({ alt, morphName }: { alt: string; morphName?: string }) {
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const node = constellationNodes.find((n) => n.id === selected) ?? null;
  const toggle = (id: string) => setSelected((cur) => (cur === id ? null : (id as NodeId)));

  return (
    <div className="feature feature--constellation">
      <div className="project__visual" style={{ viewTransitionName: morphName }}>
        <Visual3D
          scene="constellation"
          alt={alt}
          sizes="(min-width: 1024px) 38vw, 92vw"
          hotspots={constellationNodes.map((n) => ({ id: n.id, label: n.short }))}
          hotspotStyle="control"
          selected={selected}
          hovered={hovered}
          onSelect={toggle}
          onHover={setHovered}
        />
      </div>
      <p className="caption feature__caption">Illustrative topology · sample data</p>

      <div className="components" role="group" aria-label="Service components">
        {constellationNodes.map((n) => (
          <button
            key={n.id}
            type="button"
            className="components__btn"
            aria-pressed={selected === n.id}
            aria-controls="constellation-explainer"
            onClick={() => toggle(n.id)}
            onPointerEnter={() => setHovered(n.id)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(n.id)}
            onBlur={() => setHovered(null)}
          >
            {n.short}
          </button>
        ))}
      </div>
      <p id="constellation-explainer" className="components__text" aria-live="polite">
        {node ? (
          <>
            <strong>{node.short}</strong> <span className="components__type">({node.label})</span>: {node.relation}
          </>
        ) : (
          'Select a component to see how it relates to the business service.'
        )}
      </p>
    </div>
  );
}
