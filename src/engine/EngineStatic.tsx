import { useEffect, useId, useRef } from 'react';
import { engineLinks, engineNodes, type EngineNodeId } from '../data/content';

export const VB = { w: 600, h: 520 };
export const MOD = { w: 150, h: 92 };
export const CORE = { w: 228, h: 168 };

const byId = Object.fromEntries(engineNodes.map((n) => [n.id, n]));

export function linkPath(from: EngineNodeId, to: EngineNodeId) {
  const [x1, y1] = byId[from].pos2;
  const [x2, y2] = byId[to].pos2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Bow each path gently away from the centre line so routes read as workflow, not wires.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const bow = from === 'core' ? 26 : -34;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
}

/**
 * Static Conversation Engine. Used as the instant first paint, the mobile
 * composition, and the fallback whenever WebGL or motion is unavailable.
 */
export function EngineStatic({ selected, animate }: { selected: EngineNodeId | null; animate: boolean }) {
  const p = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svgRef = useRef<SVGSVGElement>(null);

  // Pulses (SMIL) start once the page is idle and pause whenever the art is offscreen.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !animate) return;
    svg.pauseAnimations();
    let visible = false;
    let ready = false;
    const sync = () => (visible && ready && !document.hidden ? svg.unpauseAnimations() : svg.pauseAnimations());
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(svg);
    const t = window.setTimeout(() => {
      ready = true;
      sync();
    }, 2500);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [animate]);

  return (
    <svg ref={svgRef} className="engine-svg" viewBox={`0 0 ${VB.w} ${VB.h}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${p}-eg-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6dce6" />
          <stop offset="0.35" stopColor="#7d8696" />
          <stop offset="0.6" stopColor="#b3bbc8" />
          <stop offset="1" stopColor="#5d6574" />
        </linearGradient>
        <pattern id={`${p}-eg-brush`} width="6" height="3" patternUnits="userSpaceOnUse">
          <rect width="6" height="1" fill="rgba(255,255,255,0.10)" />
          <rect y="2" width="6" height="0.6" fill="rgba(0,0,0,0.18)" />
        </pattern>
        <linearGradient id={`${p}-eg-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2532" stopOpacity="0.95" />
          <stop offset="1" stopColor="#0b0f15" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${p}-eg-glass-v`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2340" />
          <stop offset="1" stopColor="#141221" />
        </linearGradient>
        <radialGradient id={`${p}-eg-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#67E8F9" stopOpacity="0.16" />
          <stop offset="1" stopColor="#67E8F9" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="300" cy="262" rx="250" ry="200" fill={`url(#${p}-eg-halo)`} />

      {engineLinks.map((l) => {
        const hot = selected === l.from || selected === l.to || selected === 'core';
        return (
          <path
            key={`${l.from}-${l.to}`}
            id={`${p}-eg-p-${l.from}-${l.to}`}
            d={linkPath(l.from, l.to)}
            fill="none"
            stroke={l.kind === 'spoke' ? (hot ? '#3b6f82' : '#243746') : hot ? '#5b4b8a' : '#2d2742'}
            strokeWidth={l.kind === 'spoke' ? 1.6 : 1.2}
            strokeDasharray={l.kind === 'link' ? '3 5' : undefined}
          />
        );
      })}

      {animate &&
        engineLinks.map((l, i) => (
          <g key={`pulse-${i}`}>
            {[0, 1].map((k) => (
              <circle key={k} r={k ? 2.4 : 3} fill={l.kind === 'link' ? '#A78BFA' : '#67E8F9'} opacity={0}>
                {/* Hidden until its motion starts, so it never rests at the SVG origin. */}
                <set attributeName="opacity" to="0.9" begin={`${k * 2.6 + i * 0.4}s`} />
                <animateMotion
                  dur={`${5.5 + i * 0.7}s`}
                  begin={`${k * 2.6 + i * 0.4}s`}
                  repeatCount="indefinite"
                  keyPoints={k ? '1;0' : '0;1'}
                  keyTimes="0;1"
                  calcMode="linear"
                >
                  <mpath href={`#${p}-eg-p-${l.from}-${l.to}`} />
                </animateMotion>
              </circle>
            ))}
          </g>
        ))}

      {engineNodes
        .filter((n) => n.id !== 'core')
        .map((n) => {
          const [x, y] = n.pos2;
          const on = selected === n.id;
          const accent = n.accent === 'cyan' ? '#67E8F9' : '#A78BFA';
          return (
            <g key={n.id} transform={`translate(${x - MOD.w / 2} ${y - MOD.h / 2})`}>
              <rect width={MOD.w} height={MOD.h} rx="16" fill={`url(#${p}-eg-metal)`} />
              <rect width={MOD.w} height={MOD.h} rx="16" fill={`url(#${p}-eg-brush)`} />
              <rect
                x="6"
                y="6"
                width={MOD.w - 12}
                height={MOD.h - 12}
                rx="11"
                fill={`url(#${p}-eg-glass)`}
                stroke={on ? accent : 'rgba(255,255,255,0.08)'}
                strokeWidth={on ? 1.5 : 1}
              />
              <rect x="18" y="18" width={on ? 34 : 20} height="3" rx="1.5" fill={accent} opacity={on ? 1 : 0.7} />
              <text x="18" y="42" className="eg-code">
                {n.code}
              </text>
              <text x="18" y="70" className={n.label.length > 8 ? 'eg-label eg-label--sm' : 'eg-label'}>
                {n.label}
              </text>
            </g>
          );
        })}

      <CoreModule on={selected === 'core'} p={p} />
    </svg>
  );
}

function CoreModule({ on, p }: { on: boolean; p: string }) {
  const [x, y] = byId.core.pos2;
  return (
    <g transform={`translate(${x - CORE.w / 2} ${y - CORE.h / 2})`}>
      <rect width={CORE.w} height={CORE.h} rx="26" fill={`url(#${p}-eg-metal)`} />
      <rect width={CORE.w} height={CORE.h} rx="26" fill={`url(#${p}-eg-brush)`} />
      <rect
        x="7"
        y="7"
        width={CORE.w - 14}
        height={CORE.h - 14}
        rx="20"
        fill="#0a0d13"
        stroke={on ? '#67E8F9' : 'rgba(255,255,255,0.08)'}
        strokeWidth={on ? 1.5 : 1}
      />
      {/* agent bubble with typing indicator */}
      <rect x="22" y="22" width="132" height="46" rx="14" fill={`url(#${p}-eg-glass)`} stroke="rgba(103,232,249,0.35)" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={44 + i * 14} cy="45" r="4" fill="#67E8F9" opacity={1 - i * 0.25} />
      ))}
      {/* user bubble */}
      <rect x="82" y="78" width="124" height="38" rx="13" fill={`url(#${p}-eg-glass-v)`} stroke="rgba(167,139,250,0.4)" />
      <rect x="96" y="92" width="72" height="4" rx="2" fill="#A78BFA" opacity="0.8" />
      <rect x="96" y="102" width="44" height="4" rx="2" fill="#A78BFA" opacity="0.45" />
      <text x="22" y="146" className="eg-code eg-code--core">
        VA.CORE
      </text>
      <text x="206" y="146" className="eg-label eg-label--sm" textAnchor="end">
        Virtual Agent
      </text>
    </g>
  );
}
