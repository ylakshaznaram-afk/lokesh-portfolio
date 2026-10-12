import { Arrow, Bubble, C, Frame, Mono, Panel, Pill, T } from './parts';

function MapNode({ x, y, w, title, sub, color = C.mint }: { x: number; y: number; w: number; title: string; sub?: string; color?: string }) {
  return (
    <g>
      <Panel x={x} y={y} w={w} h={46} r={12} fill={C.panel2} stroke={C.line2} />
      <rect x={x} y={y + 12} width="3" height="22" rx="1.5" fill={color} />
      <T x={x + 16} y={sub ? y + 21 : y + 28} size={13.5} weight={560}>
        {title}
      </T>
      {sub && (
        <Mono x={x + 16} y={y + 37} size={10}>
          {sub}
        </Mono>
      )}
    </g>
  );
}

export function VisualEnterprise({ label }: { label: string }) {
  return (
    <Frame label={label} title="Enterprise Virtual Agent — illustrative">
      {/* Conversation */}
      <Panel x={28} y={28} w={360} h={464} r={20} />
      <circle cx="54" cy="56" r="5" fill={C.mint} />
      <T x={68} y={61} size={14} weight={600}>
        Virtual Agent
      </T>
      <Mono x={364} y={60} anchor="end">
        IT · HR
      </Mono>
      <line x1="28" y1="80" x2="388" y2="80" stroke={C.line} />

      <Bubble x={48} y={98} w={258} side="bot" lines={['Hi — what can I help you with today?']} />
      <Bubble x={150} y={150} w={218} side="user" lines={['I need to update my home', 'address for HR records']} />
      <Bubble
        x={48}
        y={222}
        w={276}
        side="bot"
        lines={['That’s an HR request. I’ll start an', 'HR case and show the details on', 'file from Workday to confirm.']}
      />
      <Pill x={48} y={310} text="Continue" color={C.mint} />
      <Pill x={136} y={310} text="Talk to HR" />

      <Panel x={48} y={350} w={320} h={84} r={14} fill={C.panel2} stroke="rgba(142,240,204,0.28)" />
      <Mono x={64} y={374} fill={C.mint}>
        HR CASE · DRAFT
      </Mono>
      <T x={64} y={398} size={15} weight={600}>
        HRC-DEMO-0193
      </T>
      <Mono x={64} y={420} size={10}>
        Synthetic record · Address change
      </Mono>

      <Panel x={48} y={448} w={320} h={30} r={15} fill="none" stroke={C.line2} />
      <T x={64} y={468} size={12.5} fill={C.text3}>
        Type a message…
      </T>

      {/* Workflow map */}
      <Mono x={420} y={42}>
        WORKFLOW MAP · SIMPLIFIED
      </Mono>
      <Arrow d="M570 104 V116" />
      <Arrow d="M570 162 V174" />
      <Arrow d="M570 220 V232" />
      <Arrow d="M570 278 C570 302 472 302 472 330" color="rgba(142,240,204,0.4)" />
      <Arrow d="M570 278 C570 302 584 302 584 330" color="rgba(142,240,204,0.4)" />
      <Arrow d="M570 278 C570 302 712 302 712 330" color="rgba(142,240,204,0.4)" />
      <Arrow d="M472 376 C472 404 520 404 520 428" color="rgba(141,190,255,0.45)" />
      <Arrow d="M584 376 C584 404 680 404 680 428" color="rgba(141,190,255,0.45)" />
      <Arrow d="M712 376 C712 404 680 404 680 428" color="rgba(141,190,255,0.45)" />
      <Arrow d="M670 139 H700" color="rgba(240,213,140,0.6)" dashed />

      <MapNode x={470} y={58} w={200} title="Employee request" sub="IT or HR, in natural language" />
      <MapNode x={470} y={116} w={200} title="Intent handling" sub="Greeting → topic match" />
      <MapNode x={470} y={174} w={200} title="Multi-step topic flow" sub="20+ topics" />
      <MapNode x={470} y={232} w={200} title="IntegrationHub" sub="+ Scripted REST APIs" color={C.ice} />

      <MapNode x={420} y={330} w={104} title="Workday" color={C.ice} />
      <MapNode x={536} y={330} w={96} title="CMDB" color={C.ice} />
      <MapNode x={644} y={330} w={136} title="Salesforce CSM" color={C.ice} />

      <MapNode x={460} y={428} w={120} title="HR Case" sub="record" />
      <MapNode x={620} y={428} w={120} title="Incident" sub="record" />

      <Pill x={700} y={127} text="fallback" color={C.amber} w={74} />

      <Mono x={448} y={86} anchor="end" fill={C.mint}>
        01
      </Mono>
      <Mono x={448} y={144} anchor="end" fill={C.mint}>
        02
      </Mono>
      <Mono x={448} y={202} anchor="end" fill={C.mint}>
        03
      </Mono>
      <Mono x={448} y={260} anchor="end" fill={C.ice}>
        04
      </Mono>
    </Frame>
  );
}
