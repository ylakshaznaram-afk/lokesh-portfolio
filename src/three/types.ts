/**
 * Contract every 3D scene module implements. Scenes own no UI: labels and
 * controls are HTML rendered by <Visual3D>, positioned from the hotspot
 * coordinates a scene reports.
 */

export interface HotspotPoint {
  /** Percent of the container width/height (0–100). */
  x: number;
  y: number;
}

export type HotspotMap = Record<string, HotspotPoint>;

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  /** Element whose size the canvas fills. */
  container: HTMLElement;
  /**
   * Render one deterministic rest pose (static fallbacks, lab). No pointer, no
   * loop. Scenes must create their renderer with preserveDrawingBuffer = true
   * in this mode (createRenderer's third argument) so the frame can be exported.
   */
  still?: boolean;
  /** Called with projected hotspot positions after each rendered frame. */
  onHotspots?: (points: HotspotMap) => void;
  /** Called once if early frames are consistently slow; the host falls back to the static image. */
  onSlow?: () => void;
  /** Called after the first frame has been drawn. */
  onReady?: () => void;
  /**
   * Called when the visitor clicks/taps a pickable part of the sculpture (one of
   * hotspotIds), so the host can select it exactly like its HTML control.
   */
  onPick?: (id: string) => void;
  /** Max device pixel ratio (default 1.75). */
  maxDpr?: number;
}

export interface SceneHandle {
  start(): void;
  stop(): void;
  /** Draw the rest pose once (used by `still` mode and by hosts that want a frame without a loop). */
  renderStill(): void;
  setSelected(id: string | null): void;
  setHovered(id: string | null): void;
  dispose(): void;
}

export interface SceneModule {
  create(opts: SceneOptions): SceneHandle;
  /** Ids of the hotspots this scene reports, in a stable order. */
  hotspotIds: readonly string[];
}

export type SceneKey = 'prism' | 'ribbon' | 'constellation' | 'graph';
