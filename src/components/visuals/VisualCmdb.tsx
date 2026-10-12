import { Arrow, Bubble, C, Frame, Mono, Panel, Pill, T } from './parts';

const nodes = {
  svc: { x: 220, y: 92, type: 'BUSINESS SERVICE', name: 'Payments Portal' },
  app: { x: 220, y: 184, type: 'APPLICATION', name: 'pay-api' },
  s1: { x: 112, y: 280, type: 'SERVER', name: 'app-srv-01' },
  s2: { x: 328, y: 280, type: 'SERVER', name: 'app-srv-02', hot: true },
  db: { x: 112, y: 378, type: 'DATABASE', name: 'db-cluster-a' },
  lb: { x: 328, y: 378, type: 'LOAD BALANCER', name: 'lb-edge-01' },
} as const;

type K = keyof typeof nodes;
const edges: [K, K, string][] = [
  ['svc', 'app', 'depends on'],
  ['app', 's1', 'runs on'],
  ['app', 's2', ''],
  ['s1', 'db', 'connects to'],
  ['s2', 'db', ''],
  ['lb', 's2', 'routes to'],
];

const W = 150;
const H = 52;

export function VisualCmdb({ label }: { label: string }) {
  return (
    <Frame label={label} title="CMDB-aware change conversation — illustrative">
      <Mono x={36} y={40}>
        CI RELATIONSHIPS · ILLUSTRATIVE SUBSET
      </Mono>
      <circle cx={nodes.s2.x} cy={nodes.s2.y} r="74" fill="rgba(252,211,77,0.06)" />

      {edges.map(([a, b, l]) => {
        const A = nodes[a];
        const B = nodes[b];
        const hot = 'hot' in B || 'hot' in A;
        const y1 = A.y + (B.y > A.y ? H / 2 : B.y < A.y ? -H / 2 : 0);
        const y2 = B.y + (B.y > A.y ? -H / 2 : B.y < A.y ? H / 2 : 0);
        const x1 = A.x + (A.y === B.y ? (B.x > A.x ? W / 2 : -W / 2) : 0);
        const x2 = B.x + (A.y === B.y ? (B.x > A.x ? -W / 2 : W / 2) : 0);
        const my = (y1 + y2) / 2;
        return (
          <g key={a + b}>
            <Arrow d={`M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`} color={hot ? 'rgba(252,211,77,0.5)' : 'rgba(167,139,250,0.4)'} />
            {l && (
              <Mono x={(x1 + x2) / 2 + (x1 === x2 ? 8 : 0)} y={my - 4} anchor={x1 === x2 ? 'start' : 'middle'} size={9.5}>
                {l}
              </Mono>
            )}
          </g>
        );
      })}

      {(Object.keys(nodes) as K[]).map((k) => {
        const n = nodes[k];
        const hot = 'hot' in n;
        return (
          <g key={k}>
            <rect
              x={n.x - W / 2}
              y={n.y - H / 2}
              width={W}
              height={H}
              rx={12}
              fill={C.panel2}
              stroke={hot ? C.amber : C.line2}
              strokeWidth={hot ? 1.5 : 1}
            />
            <Mono x={n.x - W / 2 + 14} y={n.y - 5} size={9.5} fill={hot ? C.amber : C.text3}>
              {n.type}
            </Mono>
            <T x={n.x - W / 2 + 14} y={n.y + 14} size={13.5} weight={560}>
              {n.name}
            </T>
          </g>
        );
      })}

      <Pill x={300} y={218} text="in change scope" color={C.amber} />
      <Mono x={36} y={470} size={10}>
        Sample CIs · real CMDB scope: 10,000+ assets
      </Mono>

      {/* Change panel */}
      <Panel x={470} y={28} w={302} h={464} r={20} />
      <Mono x={492} y={58} fill={C.cyan}>
        CHANGE REQUEST
      </Mono>
      <T x={492} y={84} size={18} weight={620}>
        CHG-DEMO-2210
      </T>
      <Mono x={750} y={58} anchor="end" size={10}>
        SYNTHETIC
      </Mono>
      <line x1="470" y1="102" x2="772" y2="102" stroke={C.line} />

      {(
        [
          ['Configuration item', 'app-srv-02'],
          ['Affected service', 'Payments Portal'],
          ['Category', 'Hardware · suggested'],
        ] as const
      ).map(([k, v], i) => (
        <g key={k}>
          <Mono x={492} y={128 + i * 36} size={10}>
            {k.toUpperCase()}
          </Mono>
          <T x={750} y={128 + i * 36} size={13} anchor="end" weight={520}>
            {v}
          </T>
        </g>
      ))}

      <Mono x={492} y={236} size={10}>
        CHANGE RISK
      </Mono>
      <Pill x={672} y={222} text="Moderate" color={C.amber} w={78} />

      <Mono x={492} y={278} size={10}>
        APPROVALS
      </Mono>
      {(
        [
          ['Technical review', 'approved', C.mint],
          ['CAB', 'pending', C.amber],
          ['Implementation', 'not started', C.text3],
        ] as const
      ).map(([k, v, c], i) => (
        <g key={k}>
          <circle cx="499" cy={300 + i * 26} r="5" fill={i === 2 ? 'none' : c} stroke={c} />
          {i < 2 && <line x1="499" y1={306 + i * 26} x2="499" y2={320 + i * 26} stroke={C.line2} />}
          <T x={514} y={305 + i * 26} size={13}>
            {k}
          </T>
          <Mono x={750} y={305 + i * 26} anchor="end" fill={c} size={10}>
            {v}
          </Mono>
        </g>
      ))}

      <Bubble
        x={490}
        y={392}
        w={262}
        side="bot"
        tint="rgba(103,232,249,0.35)"
        lines={['app-srv-02 supports Payments Portal.', 'CAB approval is still pending.']}
      />
    </Frame>
  );
}
