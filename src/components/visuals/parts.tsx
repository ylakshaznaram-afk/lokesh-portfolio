/** Shared SVG primitives for case-study illustrations (800 × 520 viewBox). */
import { useId, type ReactNode } from 'react';

export const C = {
  bg: '#0b0e14',
  panel: '#11151d',
  panel2: '#171d27',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  text: '#F4F7FB',
  text2: '#AAB4C3',
  text3: '#8d98aa',
  cyan: '#67E8F9',
  violet: '#A78BFA',
  mint: '#86EFAC',
  amber: '#FCD34D',
};

export function Frame({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 800 520" className="viz" role="img" aria-label={label} focusable="false">
      <title>{title}</title>
      <defs>
        <pattern id={`dots-${uid}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>
      <rect width="800" height="520" fill={C.bg} />
      <rect width="800" height="520" fill={`url(#dots-${uid})`} />
      {children}
    </svg>
  );
}

export function Panel({ x, y, w, h, r = 16, fill = C.panel, stroke = C.line }: { x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} />;
}

export function Mono({ x, y, children, fill = C.text3, anchor, size = 11 }: { x: number; y: number; children: ReactNode; fill?: string; anchor?: 'start' | 'middle' | 'end'; size?: number }) {
  return (
    <text x={x} y={y} className="viz-mono" fill={fill} textAnchor={anchor} fontSize={size}>
      {children}
    </text>
  );
}

export function T({ x, y, children, fill = C.text, size = 14, weight = 450, anchor }: { x: number; y: number; children: ReactNode; fill?: string; size?: number; weight?: number; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} className="viz-text" fill={fill} fontSize={size} fontWeight={weight} textAnchor={anchor}>
      {children}
    </text>
  );
}

/** Chat bubble. `lines` are pre-wrapped. */
export function Bubble({
  x,
  y,
  w,
  lines,
  side,
  tint,
  tag,
}: {
  x: number;
  y: number;
  w: number;
  lines: string[];
  side: 'bot' | 'user';
  tint?: string;
  tag?: { text: string; color: string };
}) {
  const h = 18 + lines.length * 19;
  const fill = side === 'user' ? 'rgba(167,139,250,0.14)' : C.panel2;
  const stroke = tint ?? (side === 'user' ? 'rgba(167,139,250,0.35)' : C.line2);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="13" fill={fill} stroke={stroke} />
      {lines.map((l, i) => (
        <T key={i} x={x + 14} y={y + 24 + i * 19} size={13.5} fill={side === 'user' ? C.text : C.text}>
          {l}
        </T>
      ))}
      {tag && (
        <g>
          <rect
            x={side === 'user' ? x - 8 - tag.text.length * 7.2 - 14 : x + w + 8}
            y={y + h / 2 - 10}
            width={tag.text.length * 7.2 + 14}
            height="20"
            rx="10"
            fill="none"
            stroke={tag.color}
            strokeOpacity="0.55"
          />
          <Mono
            x={side === 'user' ? x - 8 - (tag.text.length * 7.2 + 14) / 2 : x + w + 8 + (tag.text.length * 7.2 + 14) / 2}
            y={y + h / 2 + 4}
            anchor="middle"
            fill={tag.color}
            size={10}
          >
            {tag.text}
          </Mono>
        </g>
      )}
    </g>
  );
}

export function Pill({ x, y, text, color = C.text2, fill = 'none', w }: { x: number; y: number; text: string; color?: string; fill?: string; w?: number }) {
  const width = w ?? text.length * 7 + 22;
  return (
    <g>
      <rect x={x} y={y} width={width} height="24" rx="12" fill={fill} stroke={color} strokeOpacity="0.5" />
      <Mono x={x + width / 2} y={y + 16} anchor="middle" fill={color} size={10.5}>
        {text}
      </Mono>
    </g>
  );
}

export function Arrow({ d, color = C.line2, dashed }: { d: string; color?: string; dashed?: boolean }) {
  return <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray={dashed ? '4 5' : undefined} strokeLinecap="round" />;
}
