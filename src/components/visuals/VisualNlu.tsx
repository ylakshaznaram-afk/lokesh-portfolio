import { Arrow, Bubble, C, Frame, Mono, Panel, Pill, T } from './parts';

const S = { request: C.ice, clarify: C.amber, resolve: C.mint, handoff: C.coral };

function Node({ x, y, w, h = 34, text, color, mono }: { x: number; y: number; w: number; h?: number; text: string; color: string; mono?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={C.panel2} stroke={color} strokeOpacity="0.55" />
      {mono ? (
        <Mono x={x + w / 2} y={y + h / 2 + 4} anchor="middle" fill={color} size={10.5}>
          {text}
        </Mono>
      ) : (
        <T x={x + w / 2} y={y + h / 2 + 5} anchor="middle" size={12.5} weight={520}>
          {text}
        </T>
      )}
    </g>
  );
}

const intents = [
  { y: 66, id: 'password_reset', leaves: [['clarify', 'which account?'], ['resolve', 'reset steps'], ['handoff', 'agent']] },
  { y: 214, id: 'access_request', leaves: [['clarify', 'for whom?'], ['resolve', 'request'], ['handoff', 'agent']] },
  { y: 362, id: 'outage_notice', leaves: [['resolve', 'status update'], ['resolve', 'create incident'], ['handoff', 'agent']] },
] as const;

export function VisualNlu({ label }: { label: string }) {
  return (
    <Frame label={label} title="NLU IT self-service — illustrative">
      <Mono x={36} y={40}>
        INTENT MAP · SIMPLIFIED
      </Mono>

      {/* tree edges */}
      {intents.map((it) => (
        <g key={it.id}>
          <Arrow d={`M146 252 C162 252 160 ${it.y + 17} 178 ${it.y + 17}`} color="rgba(142,240,204,0.4)" />
          {it.leaves.map((_, j) => (
            <Arrow key={j} d={`M316 ${it.y + 17} C330 ${it.y + 17} 326 ${it.y - 22 + j * 40 + 15} 342 ${it.y - 22 + j * 40 + 15}`} />
          ))}
        </g>
      ))}
      <Arrow d="M91 270 V352" color="rgba(165,175,189,0.45)" dashed />

      <Node x={36} y={234} w={110} h={36} text="Utterance" color={S.request} />
      <Node x={36} y={352} w={110} h={32} text="fallback" color={C.text2} mono />
      <T x={36} y={404} size={11.5} fill={C.text3}>
        low confidence →
      </T>
      <T x={36} y={420} size={11.5} fill={C.text3}>
        re-prompt with options
      </T>

      {intents.map((it) => (
        <g key={it.id}>
          <Node x={178} y={it.y} w={138} text={it.id} color={S.request} mono />
          {it.leaves.map(([state, text], j) => (
            <Node key={j} x={342} y={it.y - 22 + j * 40} w={118} h={30} text={text} color={S[state]} mono />
          ))}
        </g>
      ))}

      {/* legend */}
      {(
        [
          ['Request', S.request],
          ['Clarify', S.clarify],
          ['Resolve', S.resolve],
          ['Handoff', S.handoff],
        ] as const
      ).map(([t, c], i) => (
        <g key={t} transform={`translate(${[36, 118, 236, 340][i]} 470)`}>
          <circle cx="5" cy="5" r="4.5" fill={c} />
          <Mono x={16} y={9} fill={C.text2} size={10.5}>
            {t}
          </Mono>
        </g>
      ))}

      {/* chat */}
      <Panel x={490} y={28} w={282} h={464} r={20} />
      <circle cx="514" cy="56" r="5" fill={C.mint} />
      <T x={528} y={61} size={14} weight={600}>
        IT Support
      </T>
      <Mono x={752} y={60} anchor="end">
        SIMULATED
      </Mono>
      <line x1="490" y1="80" x2="772" y2="80" stroke={C.line} />

      <Mono x={756} y={104} anchor="end" fill={S.request} size={10}>
        REQUEST
      </Mono>
      <Bubble x={546} y={112} w={210} side="user" tint={S.request} lines={['I can’t sign in']} />

      <Mono x={506} y={178} fill={S.clarify} size={10}>
        CLARIFY
      </Mono>
      <Bubble x={506} y={186} w={220} side="bot" tint={S.clarify} lines={['Is it your main work', 'account, or one app?']} />

      <Bubble x={604} y={254} w={152} side="user" lines={['Main account']} />

      <Mono x={506} y={316} fill={S.resolve} size={10}>
        RESOLVE
      </Mono>
      <Bubble x={506} y={324} w={232} side="bot" tint={S.resolve} lines={['Here are the self-service', 'reset steps for that account.']} />

      <Mono x={506} y={400} fill={S.handoff} size={10}>
        HANDOFF
      </Mono>
      <Bubble x={506} y={408} w={232} side="bot" tint={S.handoff} lines={['Still stuck? I can connect you.']} />
      <Pill x={506} y={455} text="Connect to an agent" color={S.handoff} />
    </Frame>
  );
}
