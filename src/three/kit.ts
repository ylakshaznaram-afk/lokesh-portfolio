/**
 * Shared 3D kit for the portfolio's sculptures (Dialogue Prism, Workflow
 * Ribbon, Service Constellation). Every scene uses these materials, lights
 * and helpers so the three read as one family: smoked glass, satin metal,
 * dark ceramic and restrained illuminated details.
 */
import {
  AdditiveBlending,
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  Object3D,
  PerspectiveCamera,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Camera,
  type Material,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { HotspotMap } from './types';

/* ------------------------------------------------------------------ */
/* Palette (kept in sync with src/styles/tokens.css)                   */
/* ------------------------------------------------------------------ */

export const PALETTE = {
  obsidian: 0x080b10,
  graphite: 0x121821,
  mint: 0x8ef0cc,
  ice: 0x8dbeff,
  white: 0xf3f5f7,
  metal: 0xc6ccd4,
  metalDark: 0x7d8590,
  ceramic: 0x161b23,
  ceramicLight: 0x232a35,
  glassTint: 0x1b2430,
} as const;

/* ------------------------------------------------------------------ */
/* Renderer + environment                                              */
/* ------------------------------------------------------------------ */

export function createRenderer(canvas: HTMLCanvasElement, maxDpr = 1.75, preserveDrawingBuffer = false) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  return renderer;
}

/**
 * Neutral studio environment for reflections. Gives glass and metal their
 * highlights without any visible background.
 */
export function applyStudioEnvironment(renderer: WebGLRenderer, scene: Scene, intensity = 0.65): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = intensity;
  return env;
}

/**
 * Consistent three-light rig: cool key from upper left, ice-blue rim from
 * behind, faint mint fill from below. Returns the lights so scenes can tune
 * intensities.
 */
export function addLightRig(scene: Scene) {
  const ambient = new AmbientLight(0xaab6c6, 0.18);
  const key = new DirectionalLight(0xf1f5fa, 1.6);
  key.position.set(-3.5, 5, 4.5);
  const rim = new DirectionalLight(PALETTE.ice, 1.1);
  rim.position.set(4, 2.5, -5);
  const fill = new PointLight(PALETTE.mint, 2.2, 14, 2);
  fill.position.set(0.5, -2.5, 3);
  scene.add(ambient, key, rim, fill);
  return { ambient, key, rim, fill };
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

export const materials = {
  /** Smoked glass: real transmission with a dark attenuation tint. */
  smokedGlass(overrides: Partial<ConstructorParameters<typeof MeshPhysicalMaterial>[0]> = {}) {
    return new MeshPhysicalMaterial({
      color: 0xdfe8f2,
      metalness: 0,
      roughness: 0.16,
      transmission: 1,
      thickness: 0.9,
      ior: 1.46,
      attenuationColor: new Color(0x2a3644),
      attenuationDistance: 0.9,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.1,
      ...overrides,
    });
  },
  /** Satin metal: fully metallic, softly diffused highlights. */
  satinMetal(overrides: Partial<ConstructorParameters<typeof MeshPhysicalMaterial>[0]> = {}) {
    return new MeshPhysicalMaterial({
      color: PALETTE.metal,
      metalness: 1,
      roughness: 0.34,
      clearcoat: 0.25,
      clearcoatRoughness: 0.45,
      envMapIntensity: 1,
      ...overrides,
    });
  },
  /** Dark ceramic: near-black, glazed, catches soft reflections. */
  darkCeramic(overrides: Partial<ConstructorParameters<typeof MeshPhysicalMaterial>[0]> = {}) {
    return new MeshPhysicalMaterial({
      color: PALETTE.ceramic,
      metalness: 0,
      roughness: 0.48,
      clearcoat: 0.7,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.9,
      ...overrides,
    });
  },
  /** Self-lit accent (unaffected by lights/tone mapping). */
  illuminated(color: number = PALETTE.mint, intensity = 1, opacity = 1) {
    return new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(intensity),
      toneMapped: false,
      transparent: opacity < 1,
      opacity,
    });
  },
};

/**
 * Light travelling along a strip or tube. Expects geometry whose uv.x runs
 * 0→1 along the length (TubeGeometry does; build custom strips the same way).
 * Animate `uniforms.uHead.value` (0–1). Set uHead2 >= 0 for a second packet.
 */
export function flowMaterial({
  color = PALETTE.mint,
  base = 0x0f1a1c,
  baseOpacity = 0.0,
  length = 0.18,
  intensity = 2.2,
  additive = true,
}: {
  color?: number;
  base?: number;
  baseOpacity?: number;
  length?: number;
  intensity?: number;
  additive?: boolean;
} = {}) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uBase: { value: new Color(base) },
      uBaseOpacity: { value: baseOpacity },
      uHead: { value: 0 },
      uHead2: { value: -1 },
      uLength: { value: length },
      uIntensity: { value: intensity },
      uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uBase;
      uniform float uBaseOpacity;
      uniform float uHead;
      uniform float uHead2;
      uniform float uLength;
      uniform float uIntensity;
      uniform float uFade;
      varying vec2 vUv;
      float packet(float head) {
        if (head < 0.0) return 0.0;
        float d = vUv.x - head;
        float trail = smoothstep(-uLength, 0.0, d) * (1.0 - smoothstep(0.0, 0.012, d));
        return trail * trail;
      }
      void main() {
        float p = max(packet(uHead), packet(uHead2));
        // soften the strip edges across its width
        float edge = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 3.0);
        vec3 col = uBase * uBaseOpacity + uColor * p * uIntensity;
        float a = clamp(uBaseOpacity + p, 0.0, 1.0) * edge * uFade;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : undefined,
    toneMapped: false,
  });
}

/* ------------------------------------------------------------------ */
/* Soft glow + contact shadow (alpha-friendly, no post-processing)     */
/* ------------------------------------------------------------------ */

let glowTexture: CanvasTexture | null = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new CanvasTexture(c);
  glowTexture.colorSpace = SRGBColorSpace;
  return glowTexture;
}

/** Additive soft glow sprite. Scale it to taste; animate `material.opacity`. */
export function glowSprite(color: number = PALETTE.mint, size = 0.6, opacity = 0.6) {
  const s = new Sprite(
    new SpriteMaterial({ map: getGlowTexture(), color, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity }),
  );
  s.scale.setScalar(size);
  return s;
}

let shadowTexture: CanvasTexture | null = null;
/** Soft elliptical contact shadow on the ground plane (y = 0 of the returned mesh). */
export function contactShadow(width = 3, depth = 2, opacity = 0.55) {
  if (!shadowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(0,0,0,0.9)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.45)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    shadowTexture = new CanvasTexture(c);
  }
  const m = new Mesh(
    new PlaneGeometry(width, depth),
    new MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ------------------------------------------------------------------ */
/* Pointer, loop, sizing, projection, disposal                         */
/* ------------------------------------------------------------------ */

/** Smoothed pointer position over the container, -1..1. Fine pointers only. */
export function pointerTracker(container: HTMLElement, enabled = true) {
  const state = { x: 0, y: 0, tx: 0, ty: 0 };
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    state.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    state.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const active = enabled && fine;
  if (active) window.addEventListener('pointermove', onMove, { passive: true });
  return {
    state,
    /** Ease toward the latest pointer; call once per frame. */
    update(ease = 0.05) {
      state.x += (state.tx - state.x) * ease;
      state.y += (state.ty - state.y) * ease;
      return state;
    },
    dispose() {
      if (active) window.removeEventListener('pointermove', onMove);
    },
  };
}

/** Animation loop with dt clamp and a slow-frame watchdog. */
export function createLoop(renderer: WebGLRenderer, tick: (elapsed: number, dt: number) => void, onSlow?: () => void) {
  let running = false;
  let last = 0;
  let elapsed = 0;
  let frames = 0;
  let slow = 0;
  let reported = false;
  const frame = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    elapsed += dt;
    frames++;
    if (frames > 5 && frames <= 45 && dt > 0.04) slow++;
    if (frames === 45 && slow > 24 && !reported) {
      reported = true;
      onSlow?.();
    }
    tick(elapsed, dt);
  };
  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      renderer.setAnimationLoop(frame);
    },
    stop() {
      running = false;
      renderer.setAnimationLoop(null);
    },
    get running() {
      return running;
    },
    get elapsed() {
      return elapsed;
    },
  };
}

/** Keep renderer + camera matched to the container size. Returns a disposer. */
export function autoResize(
  renderer: WebGLRenderer,
  container: HTMLElement,
  camera: PerspectiveCamera | OrthographicCamera,
  onResize?: (w: number, h: number) => void,
) {
  const apply = () => {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    if (camera instanceof PerspectiveCamera) {
      camera.aspect = w / h;
    }
    onResize?.(w, h);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(apply);
  ro.observe(container);
  apply();
  return () => ro.disconnect();
}

/**
 * Distance a perspective camera needs so a sphere of `radius` fits in view
 * for the current aspect (with `margin` > 1 adding breathing room).
 */
export function fitDistance(camera: PerspectiveCamera, radius: number, margin = 1.15) {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fov = Math.min(vFov, hFov);
  return (radius * margin) / Math.sin(fov / 2);
}

const tmp = new Vector3();
/** Project world positions/objects to percent coordinates of the canvas. */
export function projectHotspots(camera: Camera, entries: [string, Object3D | Vector3][]): HotspotMap {
  const out: HotspotMap = {};
  for (const [id, target] of entries) {
    if (target instanceof Vector3) tmp.copy(target);
    else target.getWorldPosition(tmp);
    tmp.project(camera);
    out[id] = { x: (tmp.x * 0.5 + 0.5) * 100, y: (-tmp.y * 0.5 + 0.5) * 100 };
  }
  return out;
}

/** Dispose every geometry, material and texture under `root`. */
export function disposeObject(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as Material | Material[] | undefined;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && (v as Texture).isTexture) (v as Texture).dispose();
      m.dispose();
    }
  });
}

/** Ease helpers for restrained motion. */
export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  damp: (current: number, target: number, lambda: number, dt: number) =>
    current + (target - current) * (1 - Math.exp(-lambda * dt)),
};
