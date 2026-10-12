import { useCallback, useEffect, useRef, useState } from 'react';
import { caseStudies, engineLinks, engineNodes, type EngineNodeId } from '../data/content';
import { useMediaQuery, useReducedMotion } from '../hooks/useMotion';
import { CORE, EngineStatic, MOD, VB } from './EngineStatic';
import type { EngineHandle } from './engine3d';

type Mode = 'static' | 'loading' | '3d';

/** QA override: `?engine=3d` or `?engine=static`. */
const forced = new URLSearchParams(window.location.search).get('engine');

function supports3D(): boolean {
  if (forced === '3d') return true;
  if (forced === 'static') return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency < 4) return false;
  if (nav.deviceMemory && nav.deviceMemory < 4) return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    // Software rasterisers make the scene janky; the static engine is the better experience there.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

const hasIdle = () => typeof window.requestIdleCallback === 'function';
const idle = (fn: () => void): number => (hasIdle() ? window.requestIdleCallback(fn, { timeout: 1500 }) : window.setTimeout(fn, 600));
const cancelIdle = (id: number) => (hasIdle() ? window.cancelIdleCallback(id) : window.clearTimeout(id));

export function HeroEngine({ onOpenCase }: { onOpenCase: (slug: string) => void }) {
  const reduced = useReducedMotion();
  const narrow = useMediaQuery('(max-width: 899px)');
  const [selected, setSelected] = useState<EngineNodeId>('core');
  const [hovered, setHovered] = useState<EngineNodeId | null>(null);
  const [mode, setMode] = useState<Mode>('static');
  const [failed, setFailed] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitEls = useRef(new Map<EngineNodeId, HTMLElement>());
  const selRef = useRef(selected);
  const hovRef = useRef(hovered);
  selRef.current = selected;
  hovRef.current = hovered;

  const want3D = !reduced && !narrow && !failed;

  useEffect(() => {
    if (!want3D) {
      setMode('static');
      return;
    }
    if (!supports3D()) {
      setFailed(true);
      return;
    }
    let handle: EngineHandle | null = null;
    let cancelled = false;
    setMode('loading');
    const id = idle(() => {
      import('./engine3d')
        .then(({ createEngine }) => {
          if (cancelled || !canvasRef.current || !stageRef.current) return;
          handle = createEngine({
            canvas: canvasRef.current,
            container: stageRef.current,
            nodes: engineNodes,
            links: engineLinks,
            hitEls: hitEls.current,
            getSelected: () => selRef.current,
            getHovered: () => hovRef.current,
            watchdog: forced !== '3d',
            onReady: () => !cancelled && setMode('3d'),
            onFail: () => {
              if (cancelled) return;
              handle?.dispose();
              handle = null;
              setFailed(true);
            },
          });
        })
        .catch(() => !cancelled && setFailed(true));
    });
    return () => {
      cancelled = true;
      cancelIdle(id);
      handle?.dispose();
      // Static positions are restored by React on the next render.
      hitEls.current.forEach((el) => el.removeAttribute('style'));
    };
  }, [want3D]);

  const node = engineNodes.find((n) => n.id === selected)!;
  const related = caseStudies.filter((c) => node.related.includes(c.slug));
  const is3D = mode === '3d';

  const setHit = useCallback(
    (id: EngineNodeId) => (el: HTMLButtonElement | null) => {
      if (el) hitEls.current.set(id, el);
      else hitEls.current.delete(id);
    },
    [],
  );

  return (
    <div className="engine" data-mode={mode}>
      <div className="engine__stage" ref={stageRef}>
        <div className="engine__static" aria-hidden="true">
          <EngineStatic selected={selected} animate={!reduced} />
        </div>
        {want3D && <canvas ref={canvasRef} className="engine__canvas" aria-hidden="true" />}

        <div className="engine__hits" role="group" aria-label="Conversation Engine modules">
          {engineNodes.map((n) => {
            const [x, y] = n.pos2;
            const size = n.id === 'core' ? CORE : MOD;
            const style = is3D
              ? undefined
              : {
                  left: `${((x - size.w / 2) / VB.w) * 100}%`,
                  top: `${((y - size.h / 2) / VB.h) * 100}%`,
                  width: `${(size.w / VB.w) * 100}%`,
                  height: `${(size.h / VB.h) * 100}%`,
                };
            return (
              <button
                key={n.id}
                ref={setHit(n.id)}
                type="button"
                className={`engine__hit ${n.id === 'core' ? 'engine__hit--core' : ''}`}
                style={style}
                aria-pressed={selected === n.id}
                aria-controls="engine-panel"
                onClick={() => setSelected(n.id)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
              >
                <span className="visually-hidden">
                  {n.label}: {n.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="engine__panel" id="engine-panel" aria-live="polite">
        <div className="engine__panel-head">
          <span className="mono">{node.code}</span>
          <span className="mono engine__hint">{narrow ? 'Tap a module' : 'Select a module'}</span>
        </div>
        <p className="engine__title">
          <span className="engine__label">{node.label}</span> {node.title}
        </p>
        <p className="engine__body">{node.body}</p>
        {related.length > 0 && (
          <div className="engine__related">
            <span className="mono">Seen in</span>
            {related.map((c) => (
              <button key={c.slug} type="button" className="chip chip--link" onClick={() => onOpenCase(c.slug)}>
                {c.index} · {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
