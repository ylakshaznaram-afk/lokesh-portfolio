import { C, Frame, Mono, Panel, T } from './parts';

const categories = [
  { name: 'Leave', sub: 'Plan or report', icon: 'M0 6h20M5 0v4M15 0v4M0 2h20v16H0z', color: C.cyan },
  { name: 'Payroll', sub: 'Pay & payslips', icon: 'M0 2h20v14H0zM0 7h20M4 12h5', color: C.violet },
  { name: 'Documents', sub: 'Letters & checks', icon: 'M3 0h10l5 5v15H3zM13 0v5h5M6 10h8M6 14h6', color: C.cyan },
  { name: 'Onboarding', sub: 'Start & exit', icon: 'M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM2 20c0-4 4-7 8-7s8 3 8 7', color: C.violet },
];

const steps = ['Submitted', 'Routed', 'In review', 'Completed'];

const statusCards = [
  { title: 'Leave request', meta: 'Routed to Leave team', state: 'In review', color: C.amber },
  { title: 'Employment letter', meta: 'Document verification', state: 'Completed', color: C.mint },
  { title: 'Payroll query', meta: 'Routed to Payroll', state: 'Routed', color: C.cyan },
];

export function VisualHr({ label }: { label: string }) {
  return (
    <Frame label={label} title="Employee Center HR journeys — illustrative">
      <Panel x={28} y={28} w={744} h={464} r={20} />
      {/* top bar */}
      <circle cx="56" cy="58" r="10" fill="none" stroke={C.violet} strokeWidth="1.5" />
      <circle cx="56" cy="58" r="3.5" fill={C.violet} />
      <T x={76} y={63} size={15} weight={620}>
        Employee Center
      </T>
      <rect x={290} y={42} width={300} height={32} rx={16} fill={C.panel2} stroke={C.line2} />
      <T x={308} y={63} size={12.5} fill={C.text3}>
        How can we help?
      </T>
      <Mono x={748} y={63} anchor="end" size={10}>
        SAMPLE EMPLOYEE
      </Mono>
      <line x1="28" y1="90" x2="772" y2="90" stroke={C.line} />

      {/* categories */}
      <Mono x={52} y={120}>
        REQUEST CATEGORIES
      </Mono>
      {categories.map((c, i) => {
        const x = 52 + i * 176;
        return (
          <g key={c.name}>
            <rect x={x} y={134} width={160} height={92} rx={14} fill={C.panel2} stroke={i === 0 ? c.color : C.line2} strokeOpacity={i === 0 ? 0.6 : 1} />
            <g transform={`translate(${x + 18} 152)`}>
              <path d={c.icon} fill="none" stroke={c.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            </g>
            <T x={x + 18} y={196} size={14} weight={580}>
              {c.name}
            </T>
            <T x={x + 18} y={214} size={11.5} fill={C.text3}>
              {c.sub}
            </T>
          </g>
        );
      })}

      {/* journey */}
      <Mono x={52} y={266}>
        YOUR JOURNEY · LEAVE REQUEST
      </Mono>
      <line x1={80} y1={300} x2={700} y2={300} stroke={C.line2} strokeWidth="2" />
      <line x1={80} y1={300} x2={493} y2={300} stroke={C.cyan} strokeWidth="2" />
      {steps.map((s, i) => {
        const x = 80 + i * 206.7;
        const done = i < 2;
        const cur = i === 2;
        return (
          <g key={s}>
            <circle cx={x} cy={300} r={cur ? 9 : 7} fill={done ? C.cyan : cur ? C.bg : C.panel2} stroke={done || cur ? C.cyan : C.line2} strokeWidth="2" />
            {cur && <circle cx={x} cy={300} r={3.5} fill={C.cyan} />}
            <T x={x} y={330} size={12.5} anchor="middle" weight={cur ? 600 : 450} fill={done || cur ? C.text : C.text3}>
              {s}
            </T>
          </g>
        );
      })}

      {/* status cards */}
      <Mono x={52} y={378}>
        STATUS
      </Mono>
      {statusCards.map((c, i) => {
        const x = 52 + i * 236;
        return (
          <g key={c.title}>
            <rect x={x} y={390} width={220} height={78} rx={14} fill={C.panel2} stroke={C.line2} />
            <T x={x + 16} y={418} size={13.5} weight={580}>
              {c.title}
            </T>
            <T x={x + 16} y={438} size={11.5} fill={C.text3}>
              {c.meta}
            </T>
            <circle cx={x + 20} cy={454} r="3.5" fill={c.color} />
            <Mono x={x + 30} y={458} size={10} fill={c.color}>
              {c.state.toUpperCase()}
            </Mono>
          </g>
        );
      })}
    </Frame>
  );
}
