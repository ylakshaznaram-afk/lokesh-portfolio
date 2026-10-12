import { useCallback, useEffect, useRef, useState } from 'react';
import { scenarios, stateMeta, type DemoCard, type DemoState, type Scenario } from '../data/demo';
import { useReducedMotion } from '../hooks/useMotion';
import { Icon } from './Icon';

interface Msg {
  id: number;
  from: 'bot' | 'user' | 'system';
  text: string;
  state?: DemoState;
  card?: DemoCard;
}

const STATES: DemoState[] = ['greeting', 'intent', 'clarify', 'resolve', 'fallback', 'handoff'];

let uid = 0;

function initial(s: Scenario): { msgs: Msg[]; node: string } {
  const n = s.nodes[s.start];
  return {
    node: s.start,
    msgs: n.bot.map((t) => ({ id: ++uid, from: 'bot' as const, text: t, state: n.state })),
  };
}

export function Demo() {
  const reduced = useReducedMotion();
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  const [{ msgs, node }, setConv] = useState(() => initial(scenario));
  const [typing, setTyping] = useState(false);
  const [visited, setVisited] = useState<Set<DemoState>>(() => new Set(['greeting']));
  const logRef = useRef<HTMLDivElement>(null);
  const optsRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);
  const wantFocus = useRef(false);

  const current = scenario.nodes[node];

  const reset = useCallback(
    (s: Scenario = scenario) => {
      window.clearTimeout(timer.current);
      setTyping(false);
      setConv(initial(s));
      setVisited(new Set(['greeting']));
    },
    [scenario],
  );

  const choose = (label: string, next: string) => {
    if (typing) return;
    wantFocus.current = optsRef.current?.contains(document.activeElement) ?? false;
    // The options unmount while the reply is "typed"; park focus on their group so it isn't lost.
    if (wantFocus.current) optsRef.current?.focus({ preventScroll: true });
    if (next === '__reset') {
      reset();
      return;
    }
    const target = scenario.nodes[next];
    setConv((c) => ({ ...c, msgs: [...c.msgs, { id: ++uid, from: 'user', text: label }] }));
    setTyping(true);
    timer.current = window.setTimeout(
      () => {
        setTyping(false);
        setVisited((v) => new Set(v).add(target.state));
        setConv((c) => ({
          node: next,
          msgs: [
            ...c.msgs,
            ...(target.intent ? [{ id: ++uid, from: 'system' as const, text: `Intent matched · ${target.intent}` }] : []),
            ...target.bot.map((t, i) => ({
              id: ++uid,
              from: 'bot' as const,
              text: t,
              state: i === 0 ? target.state : undefined,
              card: i === target.bot.length - 1 ? target.card : undefined,
            })),
          ],
        }));
      },
      reduced ? 0 : 650,
    );
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Keep the newest message in view inside the log (never scrolls the page).
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [msgs, typing, reduced]);

  // Keyboard users keep their place: focus the first new option after a reply.
  useEffect(() => {
    if (!typing && wantFocus.current) {
      wantFocus.current = false;
      optsRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
  }, [typing, node]);

  const pickScenario = (s: Scenario) => {
    setScenarioId(s.id);
    reset(s);
  };

  return (
    <section className="section demo" id="demo" aria-labelledby="demo-title">
      <div className="container">
        <header className="section-head">
          <p className="kicker">Conversation design</p>
          <h2 id="demo-title" className="section-head__title">
            How I shape a conversation.
          </h2>
          <p className="section-head__lead">
            Pick a scenario and steer it — including the wrong turns. It runs in your browser with sample data; no real tickets or systems are involved.
          </p>
        </header>

        <div className="demo__shell reveal">
          <div className="demo__panel demo__panel--control">
            <p className="demo__badge">
              <span aria-hidden="true" className="demo__badge-dot" />
              Interactive concept • Sample data
            </p>

            <fieldset className="demo__scenarios">
              <legend className="mono">Scenario</legend>
              {scenarios.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="demo__scenario"
                  aria-pressed={s.id === scenarioId}
                  onClick={() => pickScenario(s)}
                >
                  <span className="mono">0{i + 1}</span>
                  {s.label}
                </button>
              ))}
            </fieldset>

            <div className="demo__states">
              <p className="mono">Workflow stage</p>
              <ol>
                {STATES.map((st) => {
                  const isCurrent = current.state === st;
                  return (
                    <li
                      key={st}
                      className={`demo__state demo__state--${st} ${isCurrent ? 'is-current' : ''} ${visited.has(st) ? 'is-visited' : ''}`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className="demo__state-dot" aria-hidden="true" />
                      <span className="demo__state-label">{stateMeta[st].label}</span>
                      {visited.has(st) && !isCurrent && <span className="visually-hidden"> (visited)</span>}
                    </li>
                  );
                })}
              </ol>
              <p className="demo__hint">{stateMeta[current.state].hint}</p>
            </div>
          </div>

          <div className="demo__panel demo__panel--chat">
            <div className="demo__chat-head">
              <span className="demo__avatar" aria-hidden="true" />
              <div>
                <p className="demo__chat-title">Concept assistant</p>
                <p className="mono">Simulation</p>
              </div>
              <button type="button" className="btn btn--ghost btn--sm demo__reset" onClick={() => reset()}>
                <Icon name="reset" size={16} /> Reset
              </button>
            </div>

            <div className="demo__log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}>
              {msgs.map((m) => (
                <Message key={m.id} m={m} />
              ))}
              {typing && (
                <div className="msg msg--bot msg--typing" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <div className="demo__options" ref={optsRef} aria-label="Reply options" role="group" tabIndex={-1}>
              <p className="mono demo__options-label">Your reply</p>
              <div className="demo__options-row">
                {!typing &&
                  (current.options.length ? (
                    current.options.map((o) => (
                      <button key={o.label} type="button" className="demo__opt" onClick={() => choose(o.label, o.next)}>
                        {o.label}
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      className="demo__opt demo__opt--reset"
                      onClick={() => {
                        wantFocus.current = true;
                        reset();
                      }}
                    >
                      <Icon name="reset" size={16} /> Start over
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Message({ m }: { m: Msg }) {
  if (m.from === 'system') {
    return (
      <p className="msg msg--system mono">
        <span className="visually-hidden">Annotation: </span>
        {m.text}
      </p>
    );
  }
  return (
    <div className={`msg msg--${m.from} ${m.state ? `msg--${m.state}` : ''}`}>
      {m.state && m.from === 'bot' && <span className={`msg__tag mono tag--${m.state}`}>{stateMeta[m.state].label}</span>}
      <p>
        <span className="visually-hidden">{m.from === 'bot' ? 'Assistant: ' : 'You: '}</span>
        {m.text}
      </p>
      {m.card && <CardView card={m.card} />}
    </div>
  );
}

function CardView({ card }: { card: DemoCard }) {
  return (
    <div className={`demo-card demo-card--${card.kind}`}>
      <p className="demo-card__title">{card.title}</p>
      {card.rows && (
        <dl>
          {card.rows.map(([k, v]) => (
            <div key={k}>
              <dt className="mono">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {card.steps && (
        <ol>
          {card.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      {card.note && <p className="demo-card__note mono">{card.note}</p>}
    </div>
  );
}
