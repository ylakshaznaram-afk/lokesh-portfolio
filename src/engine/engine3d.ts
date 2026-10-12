/**
 * The Conversation Engine — WebGL scene.
 *
 * Loaded lazily after first paint. It renders the same composition as
 * EngineStatic: a smoked-glass conversation core, four brushed-metal
 * modules (ITSM, HRSD, CMDB, Integrations), workflow paths and pulses.
 *
 * It owns no UI. Accessible controls are HTML buttons rendered by React; this
 * module only positions them over the projected modules each frame.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  QuadraticBezierCurve3,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { EngineNode, EngineNodeId } from '../data/content';

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  nodes: EngineNode[];
  links: { from: EngineNodeId; to: EngineNodeId; kind: 'spoke' | 'link' }[];
  hitEls: Map<EngineNodeId, HTMLElement>;
  getSelected: () => EngineNodeId;
  getHovered: () => EngineNodeId | null;
  onReady: () => void;
  onFail: (reason: string) => void;
  /** Fall back automatically when early frames are slow (default true). */
  watchdog?: boolean;
}

export interface EngineHandle {
  dispose: () => void;
}

const CYAN = new Color('#67E8F9');
const VIOLET = new Color('#A78BFA');
const MOD_SIZE = { w: 1.05, h: 0.64, d: 0.2 };
const CORE_SIZE = { w: 1.62, h: 1.2, d: 0.2 };

export function createEngine(o: EngineOptions): EngineHandle {
  const { canvas, container } = o;
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    o.onFail('webgl');
    return { dispose() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
  track(env);

  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.1, 9);

  scene.add(new AmbientLight(0x9fb4cc, 0.25));
  const key = new DirectionalLight(0xe8f6ff, 1.3);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new PointLight(0xa78bfa, 14, 12, 2);
  rim.position.set(3, -1.5, -2.5);
  scene.add(rim);
  const fill = new PointLight(0x67e8f9, 8, 10, 2);
  fill.position.set(-3, -2, 2);
  scene.add(fill);

  const root = new Group();
  scene.add(root);

  /* ---------- materials ---------- */
  const brushed = track(
    new MeshPhysicalMaterial({
      color: 0x9aa3b1,
      metalness: 1,
      roughness: 0.34,
      anisotropy: 0.75,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
    }),
  );
  const smoked = track(
    new MeshPhysicalMaterial({
      color: 0x0d121a,
      metalness: 0.1,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.92,
    }),
  );
  const smokedViolet = track(smoked.clone());
  smokedViolet.color = new Color(0x1d1830);

  /* ---------- label textures (drawn once fonts are ready) ---------- */
  function labelTexture(code: string, label: string, accent: Color, w: number, h: number) {
    const c = document.createElement('canvas');
    const scale = 2;
    c.width = 512 * scale;
    c.height = Math.round((512 * h) / w) * scale;
    const g = c.getContext('2d')!;
    g.scale(scale, scale);
    const H = c.height / scale;
    g.fillStyle = '#' + accent.getHexString();
    g.fillRect(40, 40, 54, 7);
    g.fillStyle = '#8d98aa';
    g.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
    g.fillText(code, 40, 104);
    g.fillStyle = '#F4F7FB';
    g.font = `600 ${label.length > 9 ? 64 : 74}px "Bricolage Grotesque Variable", system-ui, sans-serif`;
    g.fillText(label, 38, H - 52);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return track(t);
  }

  function coreLabelTexture(code: string, label: string, w: number, h: number) {
    const c = document.createElement('canvas');
    const scale = 2;
    const W = 640;
    const H = Math.round((W * h) / w);
    c.width = W * scale;
    c.height = H * scale;
    const g = c.getContext('2d')!;
    g.scale(scale, scale);
    g.textBaseline = 'middle';
    g.fillStyle = '#8d98aa';
    g.font = '500 30px "JetBrains Mono Variable", ui-monospace, monospace';
    g.fillText(code, 8, H / 2);
    g.fillStyle = '#F4F7FB';
    g.font = '600 52px "Bricolage Grotesque Variable", system-ui, sans-serif';
    g.textAlign = 'right';
    g.fillText(label, W - 8, H / 2);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return track(t);
  }

  /* ---------- modules ---------- */
  interface ModuleRec {
    id: EngineNodeId;
    group: Group;
    base: Vector3;
    strip: MeshBasicMaterial;
    accent: Color;
    lift: number;
    w: number;
    h: number;
  }
  const modules = new Map<EngineNodeId, ModuleRec>();

  const modShell = track(new RoundedBoxGeometry(MOD_SIZE.w, MOD_SIZE.h, MOD_SIZE.d, 4, 0.08));
  const modFace = track(new RoundedBoxGeometry(MOD_SIZE.w - 0.1, MOD_SIZE.h - 0.1, 0.05, 3, 0.05));
  const modPlane = track(new PlaneGeometry(MOD_SIZE.w - 0.14, MOD_SIZE.h - 0.14));
  const stripGeo = track(new PlaneGeometry(0.16, 0.022));

  for (const n of o.nodes) {
    const g = new Group();
    const accent = n.accent === 'cyan' ? CYAN : VIOLET;
    const strip = track(new MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.7, toneMapped: false }));
    let w = MOD_SIZE.w;
    let h = MOD_SIZE.h;

    if (n.id === 'core') {
      w = CORE_SIZE.w;
      h = CORE_SIZE.h;
      const shell = new Mesh(track(new RoundedBoxGeometry(w, h, CORE_SIZE.d, 6, 0.14)), brushed);
      g.add(shell);
      const inner = new Mesh(track(new RoundedBoxGeometry(w - 0.1, h - 0.1, 0.05, 4, 0.1)), smoked);
      inner.position.z = CORE_SIZE.d / 2;
      g.add(inner);
      // Agent bubble + typing dots
      const bubbleA = new Mesh(track(new RoundedBoxGeometry(0.92, 0.32, 0.08, 4, 0.1)), smoked);
      bubbleA.position.set(-0.22, 0.25, 0.2);
      g.add(bubbleA);
      const dotGeo = track(new SphereGeometry(0.035, 16, 12));
      const dots: Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Mesh(dotGeo, track(new MeshBasicMaterial({ color: CYAN, toneMapped: false, transparent: true })));
        d.position.set(-0.52 + i * 0.1, 0.25, 0.26);
        g.add(d);
        dots.push(d);
      }
      g.userData.dots = dots;
      // User bubble (violet)
      const bubbleB = new Mesh(track(new RoundedBoxGeometry(0.86, 0.27, 0.08, 4, 0.09)), smokedViolet);
      bubbleB.position.set(0.24, -0.13, 0.24);
      g.add(bubbleB);
      const barMat = track(new MeshBasicMaterial({ color: VIOLET, toneMapped: false, transparent: true, opacity: 0.75 }));
      const bar1 = new Mesh(track(new PlaneGeometry(0.46, 0.028)), barMat);
      bar1.position.set(0.14, -0.1, 0.285);
      const bar2 = new Mesh(track(new PlaneGeometry(0.28, 0.028)), barMat);
      bar2.position.set(0.05, -0.165, 0.285);
      g.add(bar1, bar2);
      const coreLabelMat = track(
        new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, opacity: 0 }),
      );
      const coreLabel = new Mesh(track(new PlaneGeometry(w - 0.22, 0.25)), coreLabelMat);
      coreLabel.position.set(0, -h / 2 + 0.2, CORE_SIZE.d / 2 + 0.031);
      g.add(coreLabel);
      g.userData.labelMat = coreLabelMat;
    } else {
      g.add(new Mesh(modShell, brushed));
      const face = new Mesh(modFace, smoked);
      face.position.z = MOD_SIZE.d / 2;
      g.add(face);
      const s = new Mesh(stripGeo, strip);
      s.position.set(-MOD_SIZE.w / 2 + 0.2, MOD_SIZE.h / 2 - 0.12, MOD_SIZE.d / 2 + 0.03);
      g.add(s);
      const labelMat = track(
        new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, opacity: 0 }),
      );
      const plane = new Mesh(modPlane, labelMat);
      plane.position.z = MOD_SIZE.d / 2 + 0.031;
      g.add(plane);
      g.userData.labelMat = labelMat;
    }

    const base = new Vector3(...n.pos3);
    g.position.copy(base);
    // Modules face slightly toward the core for a more spatial read.
    g.rotation.y = -base.x * 0.08;
    g.rotation.x = base.y * 0.05;
    root.add(g);
    modules.set(n.id, { id: n.id, group: g, base, strip, accent, lift: 0, w, h });
  }

  // Draw face labels once web fonts are available (canvas can't wait on CSS).
  const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    if (disposed) return;
    for (const n of o.nodes) {
      const m = modules.get(n.id)!;
      const mat = m.group.userData.labelMat as MeshBasicMaterial;
      mat.map =
        n.id === 'core'
          ? coreLabelTexture(n.code, n.label, CORE_SIZE.w - 0.22, 0.25)
          : labelTexture(n.code, n.label, m.accent, MOD_SIZE.w - 0.14, MOD_SIZE.h - 0.14);
      mat.opacity = 1;
      mat.needsUpdate = true;
    }
  });

  /* ---------- paths & pulses ---------- */
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return track(new CanvasTexture(c)) as Texture;
  })();

  interface PathRec {
    from: EngineNodeId;
    to: EngineNodeId;
    curve: QuadraticBezierCurve3;
    mat: MeshBasicMaterial;
    pulses: { sprite: Sprite; core: Mesh; t: number; dir: 1 | -1; speed: number }[];
    color: Color;
  }
  const paths: PathRec[] = [];
  const pulseGeo = track(new SphereGeometry(0.028, 12, 8));

  for (const l of o.links) {
    // Paths run from the back of each module, like cabling behind the panels,
    // so they never cross a module face.
    const a = new Vector3(...o.nodes.find((n) => n.id === l.from)!.pos3);
    const b = new Vector3(...o.nodes.find((n) => n.id === l.to)!.pos3);
    a.z -= 0.16;
    b.z -= 0.16;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.z -= l.kind === 'spoke' ? 0.35 : 0.2;
    mid.y += l.kind === 'spoke' ? 0.12 : 0;
    if (l.kind === 'link') mid.x += Math.sign(mid.x) * 0.45;
    const curve = new QuadraticBezierCurve3(a, mid, b);
    const color = l.kind === 'spoke' ? CYAN : VIOLET;
    const mat = track(
      new MeshBasicMaterial({ color: color.clone().multiplyScalar(0.28), transparent: true, opacity: 0.9, toneMapped: false }),
    );
    const tube = new Mesh(track(new TubeGeometry(curve, 48, l.kind === 'spoke' ? 0.011 : 0.008, 6, false)), mat);
    root.add(tube);

    const pulses: PathRec['pulses'] = [];
    for (let k = 0; k < 2; k++) {
      const sm = track(
        new SpriteMaterial({ map: glowTex, color, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }),
      );
      const sprite = new Sprite(sm);
      sprite.scale.setScalar(0.3);
      const core = new Mesh(pulseGeo, track(new MeshBasicMaterial({ color, toneMapped: false })));
      root.add(sprite, core);
      pulses.push({ sprite, core, t: Math.random(), dir: k ? -1 : 1, speed: 0.1 + Math.random() * 0.04 });
    }
    paths.push({ from: l.from, to: l.to, curve, mat, pulses, color });
  }

  /* ---------- sizing ---------- */
  let width = 1;
  let height = 1;
  function resize() {
    const r = container.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Fit the composition's ~5.6 × 4 unit footprint in either orientation.
    const vFov = (camera.fov * Math.PI) / 180;
    const distH = 2.35 / Math.tan(vFov / 2);
    const distW = 3.05 / (Math.tan(vFov / 2) * camera.aspect);
    camera.position.z = Math.max(distH, distW);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* ---------- pointer ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onPointer = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    pointer.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    pointer.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  };
  if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true });

  /* ---------- hit-area projection ---------- */
  const v = new Vector3();
  const corner = new Vector3();
  function placeHitAreas() {
    for (const [id, m] of modules) {
      const el = o.hitEls.get(id);
      if (!el) continue;
      m.group.getWorldPosition(v);
      v.project(camera);
      const cx = (v.x * 0.5 + 0.5) * width;
      const cy = (-v.y * 0.5 + 0.5) * height;
      corner.set(m.w / 2, m.h / 2, 0);
      m.group.localToWorld(corner);
      corner.project(camera);
      const hw = Math.abs((corner.x * 0.5 + 0.5) * width - cx);
      const hh = Math.abs((-corner.y * 0.5 + 0.5) * height - cy);
      el.style.left = `${cx - hw}px`;
      el.style.top = `${cy - hh}px`;
      el.style.width = `${hw * 2}px`;
      el.style.height = `${hh * 2}px`;
    }
  }

  /* ---------- loop ---------- */
  let disposed = false;
  let running = false;
  let visible = true;
  let last = performance.now();
  let elapsed = 0;
  let frames = 0;
  let slowFrames = 0;
  let readySent = false;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    // Performance watchdog: if most early frames are slow, fall back to the static engine.
    frames++;
    if (frames > 5 && frames <= 45 && dt > 0.04) slowFrames++;
    if (frames === 45 && slowFrames > 24 && o.watchdog !== false) {
      o.onFail('slow');
      return;
    }

    const selected = o.getSelected();
    const hovered = o.getHovered();

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    root.rotation.y = pointer.x * 0.2 + Math.sin(elapsed * 0.13) * 0.07;
    root.rotation.x = pointer.y * 0.1 + Math.sin(elapsed * 0.09) * 0.03;

    let i = 0;
    for (const m of modules.values()) {
      const active = m.id === selected;
      const hot = active || m.id === hovered;
      const targetLift = active ? 1 : hot ? 0.5 : 0;
      m.lift += (targetLift - m.lift) * 0.08;
      m.group.position.set(
        m.base.x,
        m.base.y + Math.sin(elapsed * 0.6 + i * 1.7) * 0.035,
        m.base.z + m.lift * 0.28,
      );
      m.group.scale.setScalar(1 + m.lift * 0.05);
      m.strip.opacity = 0.55 + m.lift * 0.45;
      m.strip.color.copy(m.accent).multiplyScalar(1 + m.lift * 0.6);
      i++;
    }

    const coreRec = modules.get('core')!;
    const dots = coreRec.group.userData.dots as Mesh[] | undefined;
    dots?.forEach((d, k) => {
      const p = (Math.sin(elapsed * 3 - k * 0.7) + 1) / 2;
      d.scale.setScalar(0.75 + p * 0.45);
      (d.material as MeshBasicMaterial).opacity = 0.45 + p * 0.55;
    });

    for (const p of paths) {
      const hot = selected === 'core' ? p.from === 'core' : p.from === selected || p.to === selected;
      const target = hot ? 0.75 : 0.28;
      const c = p.mat.color;
      const goal = p.color.clone().multiplyScalar(target);
      c.lerp(goal, 0.08);
      for (const pulse of p.pulses) {
        pulse.t += pulse.dir * pulse.speed * dt * (hot ? 1.8 : 1);
        if (pulse.t > 1) pulse.t -= 1;
        if (pulse.t < 0) pulse.t += 1;
        p.curve.getPoint(pulse.t, v);
        pulse.sprite.position.copy(v);
        pulse.core.position.copy(v);
        const fade = Math.sin(pulse.t * Math.PI); // fade in/out at path ends
        (pulse.sprite.material as SpriteMaterial).opacity = (hot ? 0.75 : 0.4) * fade;
        pulse.sprite.scale.setScalar(hot ? 0.36 : 0.26);
        pulse.core.scale.setScalar(0.4 + fade * 0.6);
      }
    }

    renderer.render(scene, camera);
    placeHitAreas();

    if (!readySent) {
      readySent = true;
      o.onReady();
    }
  }

  // Also pause while a modal (case study) covers the page.
  const isCovered = () => document.documentElement.classList.contains('is-locked');

  function updateRunning() {
    const should = visible && !document.hidden && !disposed && !isCovered();
    if (should === running) return;
    running = should;
    if (running) {
      last = performance.now();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  }

  // Pause when the hero is offscreen or the tab is hidden.
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    updateRunning();
  });
  io.observe(container);
  const onVis = () => updateRunning();
  document.addEventListener('visibilitychange', onVis);
  const mo = new MutationObserver(onVis);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  const onLost = (e: Event) => {
    e.preventDefault();
    o.onFail('context-lost');
  };
  canvas.addEventListener('webglcontextlost', onLost);

  updateRunning();

  return {
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
