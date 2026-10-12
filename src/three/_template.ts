/**
 * Reference implementation of the SceneModule contract. Copy this structure
 * for each sculpture: build → resize → loop → hotspots → selection → dispose.
 * (Not shipped: nothing imports it in production.)
 */
import { Group, Mesh, PerspectiveCamera, Scene, SphereGeometry, CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  addLightRig,
  applyStudioEnvironment,
  autoResize,
  contactShadow,
  createLoop,
  createRenderer,
  disposeObject,
  ease,
  fitDistance,
  flowMaterial,
  glowSprite,
  materials,
  PALETTE,
  pointerTracker,
  projectHotspots,
} from './kit';
import type { SceneHandle, SceneOptions } from './types';

export const hotspotIds = ['glass', 'metal'] as const;

export function create(opts: SceneOptions): SceneHandle {
  const { canvas, container, still = false } = opts;
  const renderer = createRenderer(canvas, opts.maxDpr ?? 1.75, still);
  const scene = new Scene();
  applyStudioEnvironment(renderer, scene);
  addLightRig(scene);

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  const root = new Group();
  scene.add(root);

  const glass = new Mesh(new RoundedBoxGeometry(1.4, 1, 0.35, 6, 0.16), materials.smokedGlass());
  glass.position.set(-0.55, 0.2, 0);
  const metal = new Mesh(new RoundedBoxGeometry(1.2, 0.8, 0.3, 6, 0.14), materials.satinMetal());
  metal.position.set(0.6, -0.25, -0.2);
  const ceramic = new Mesh(new SphereGeometry(0.25, 32, 16), materials.darkCeramic());
  ceramic.position.set(0, -0.75, 0.4);
  root.add(glass, metal, ceramic);

  const curve = new CatmullRomCurve3([new Vector3(-1.4, 0.2, 0.3), new Vector3(0, 0, 0.45), new Vector3(1.4, -0.3, 0.2)]);
  const flow = flowMaterial({ baseOpacity: 0.12 });
  root.add(new Mesh(new TubeGeometry(curve, 96, 0.02, 8, false), flow));
  const glow = glowSprite(PALETTE.mint, 0.5, 0.7);
  root.add(glow);
  const shadow = contactShadow(3.2, 1.6, 0.5);
  shadow.position.y = -1.05;
  root.add(shadow);

  const stopResize = autoResize(renderer, container, camera, () => {
    camera.position.set(2.2, 1.1, fitDistance(camera, 1.7));
    camera.lookAt(0, 0, 0);
  });

  const pointer = pointerTracker(container, !still);
  const selected = { id: null as string | null };

  function update(t: number, dt: number) {
    const p = pointer.update();
    root.rotation.y = ease.damp(root.rotation.y, p.x * 0.25 + Math.sin(t * 0.2) * 0.08, 3, dt);
    root.rotation.x = ease.damp(root.rotation.x, p.y * 0.08, 3, dt);
    const head = (t * 0.25) % 1;
    flow.uniforms.uHead.value = head;
    curve.getPoint(head, glow.position);
    glass.scale.setScalar(ease.damp(glass.scale.x, selected.id === 'glass' ? 1.05 : 1, 6, dt));
  }

  function draw() {
    renderer.render(scene, camera);
    opts.onHotspots?.(projectHotspots(camera, [['glass', glass], ['metal', metal]]));
  }

  let readySent = false;
  const loop = createLoop(
    renderer,
    (t, dt) => {
      update(t, dt);
      draw();
      if (!readySent) {
        readySent = true;
        opts.onReady?.();
      }
    },
    opts.onSlow,
  );

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    renderStill() {
      update(1.2, 1); // fixed time → deterministic rest pose
      draw();
      if (!readySent) {
        readySent = true;
        opts.onReady?.();
      }
    },
    setSelected: (id) => (selected.id = id),
    setHovered: () => {},
    dispose() {
      loop.stop();
      stopResize();
      pointer.dispose();
      disposeObject(scene);
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
