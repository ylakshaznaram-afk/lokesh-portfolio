import { useEffect, useRef, useState, type ReactNode } from 'react';
import { art as ARTS, NARROW_MEDIA } from '../assets/visuals/art';
import { useMediaQuery, useReducedMotion } from '../hooks/useMotion';
import { registerVisual } from '../three/activation';
import { deviceSupports3D, forced3D, LIVE_3D_MEDIA } from '../three/capability';
import { sceneLoaders } from '../three/registry';
import type { HotspotMap, SceneHandle, SceneKey } from '../three/types';

export interface HotspotSpec {
  id: string;
  label: string;
}

interface Props {
  scene: SceneKey;
  alt: string;
  /** `sizes` attribute for the responsive static image. */
  sizes: string;
  /** Above-the-fold visual: load the image eagerly with high priority. */
  priority?: boolean;
  /** Extra media query in which the square composition is used (e.g. a tall frame on wide screens). */
  squareMedia?: string;
  hotspots?: readonly HotspotSpec[];
  /**
   * 'label' — quiet text tags (decorative, hidden from assistive tech).
   * 'control' — clickable pills for pointer users; the accessible controls for
   * the same actions must exist elsewhere in the component that uses this.
   */
  hotspotStyle?: 'label' | 'control';
  selected?: string | null;
  hovered?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  className?: string;
  children?: ReactNode;
}

type LiveState = 'off' | 'loading' | 'ready';

const idle = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 1200 }) : window.setTimeout(fn, 300);
const cancelIdle = (id: number) =>
  typeof window.cancelIdleCallback === 'function' ? window.cancelIdleCallback(id) : window.clearTimeout(id);

/**
 * A sculpture with a static image first and a live WebGL scene on top when
 * the device, viewport and motion preferences allow it. Only the most visible
 * live visual on the page renders (see three/activation.ts).
 */
export function Visual3D({
  scene,
  alt,
  sizes,
  priority = false,
  squareMedia,
  hotspots = [],
  hotspotStyle = 'label',
  selected = null,
  hovered = null,
  onSelect,
  onHover,
  className = '',
  children,
}: Props) {
  const reduced = useReducedMotion();
  const liveMedia = useMediaQuery(LIVE_3D_MEDIA);
  const narrow = useMediaQuery(NARROW_MEDIA);
  const squareWide = useMediaQuery(squareMedia ?? 'not all');
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState<LiveState>('off');
  // The prerendered HTML has no canvas; only add one after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const art = ARTS[scene];
  const variant = mounted && art.narrow && (narrow || (squareMedia && squareWide)) ? art.narrow : art.main;
  const allowLive = mounted && !failed && liveMedia && (forced3D || (!reduced && deviceSupports3D()));

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const spotRefs = useRef(new Map<string, HTMLElement>());
  const selRef = useRef(selected);
  const hovRef = useRef(hovered);
  selRef.current = selected;
  hovRef.current = hovered;

  useEffect(() => {
    if (!allowLive) return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let disposed = false;
    let creating = false;
    let activeNow = false;
    let idleId = 0;

    const place = (points: HotspotMap) => {
      for (const [id, el] of spotRefs.current) {
        const p = points[id];
        if (!p) continue;
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
      }
    };
    const fail = () => {
      if (disposed) return;
      handleRef.current?.dispose();
      handleRef.current = null;
      setFailed(true);
      setLive('off');
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      fail();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    const create = async () => {
      idleId = 0;
      if (disposed || creating || handleRef.current) return;
      creating = true;
      setLive('loading');
      try {
        const mod = await sceneLoaders[scene]();
        if (disposed) return;
        const handle = mod.create({
          canvas,
          container: stage,
          onHotspots: place,
          onReady: () => !disposed && setLive('ready'),
          onSlow: forced3D ? undefined : fail,
        });
        handle.setSelected(selRef.current);
        handle.setHovered(hovRef.current);
        handleRef.current = handle;
        if (activeNow) handle.start();
      } catch {
        fail();
      }
    };

    const unregister = registerVisual(stage, (active) => {
      activeNow = active;
      if (rootRef.current) rootRef.current.dataset.active = String(active);
      if (active) {
        if (handleRef.current) handleRef.current.start();
        else if (!creating && !idleId) idleId = idle(() => void create());
      } else {
        // Don't build a scene that has already scrolled away.
        if (idleId) cancelIdle(idleId);
        idleId = 0;
        handleRef.current?.stop();
      }
    });

    return () => {
      disposed = true;
      cancelIdle(idleId);
      unregister();
      canvas.removeEventListener('webglcontextlost', onLost);
      handleRef.current?.dispose();
      handleRef.current = null;
      setLive('off');
    };
  }, [allowLive, scene]);

  useEffect(() => {
    handleRef.current?.setSelected(selected);
  }, [selected]);
  useEffect(() => {
    handleRef.current?.setHovered(hovered);
  }, [hovered]);

  const isLive = allowLive && live === 'ready';
  const setSpot = (id: string) => (el: HTMLElement | null) => {
    if (el) spotRefs.current.set(id, el);
    else spotRefs.current.delete(id);
  };

  return (
    <div ref={rootRef} className={`v3d v3d--${scene} ${className}`} data-live={isLive ? 'true' : 'false'}>
      <div ref={stageRef} className="v3d__stage" style={{ aspectRatio: `${variant.width} / ${variant.height}` }}>
        <picture className="v3d__picture">
          {art.narrow && <source media={NARROW_MEDIA} srcSet={art.narrow.srcSet} sizes={sizes} width={art.narrow.width} height={art.narrow.height} />}
          {art.narrow && squareMedia && (
            <source media={squareMedia} srcSet={art.narrow.srcSet} sizes={sizes} width={art.narrow.width} height={art.narrow.height} />
          )}
          <img
            className="v3d__img"
            src={art.main.src}
            srcSet={art.main.srcSet}
            sizes={sizes}
            width={art.main.width}
            height={art.main.height}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        </picture>
        {allowLive && <canvas ref={canvasRef} className="v3d__canvas" aria-hidden="true" />}

        {hotspots.map((h) => {
          const p = variant.hotspots[h.id];
          const style = isLive ? undefined : p ? { left: `${p.x}%`, top: `${p.y}%` } : { display: 'none' };
          const state = selected === h.id ? 'selected' : hovered === h.id ? 'hovered' : undefined;
          return hotspotStyle === 'control' ? (
            <button
              key={h.id}
              ref={setSpot(h.id)}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="v3d__spot v3d__spot--control"
              data-state={state}
              style={style}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect?.(h.id)}
              onPointerEnter={() => onHover?.(h.id)}
              onPointerLeave={() => onHover?.(null)}
            >
              {h.label}
            </button>
          ) : (
            <span key={h.id} ref={setSpot(h.id)} aria-hidden="true" className="v3d__spot v3d__spot--label" data-state={state} style={style}>
              {h.label}
            </span>
          );
        })}
        {children}
      </div>
    </div>
  );
}
