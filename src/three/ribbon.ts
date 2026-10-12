/**
 * Workflow Ribbon — featured-project sculpture.
 *
 * One continuous satin-metal ribbon runs from a source dock, through three
 * floating smoked-glass gateways (Request → Route → Resolve), into a target
 * dock — the way a record moves from a channel, through a ServiceNow flow, into
 * the system that resolves it. A mint pulse rides a fine engraved channel along
 * the ribbon: it leaves the source dock, eases through each gateway (whose
 * inlay answers softly) and is absorbed by the target dock. When a stage is
 * selected, the pulse travels to that gateway and settles inside it.
 *
 * Follows the SceneModule contract (see _template.ts): build → autoResize →
 * loop → hotspots every drawn frame → onReady → still pose → selection → dispose.
 *
 * Written against three.js 0.186 (the glass patches below target that
 * version's transmission chunk; a dev warning fires if they stop applying).
 */
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CustomBlending,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  OneFactor,
  OneMinusSrcAlphaFactor,
  Path,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderChunk,
  ShaderMaterial,
  Shape,
  TubeGeometry,
  Vector3,
  Vector4,
  type WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  addLightRig,
  applyStudioEnvironment,
  autoResize,
  contactShadow,
  createLoop,
  createRenderer,
  disposeObject,
  ease,
  flowMaterial,
  materials,
  PALETTE,
  pointerTracker,
  projectHotspots,
} from './kit';
import type { SceneHandle, SceneOptions } from './types';

export const hotspotIds = ['request', 'route', 'resolve'] as const;
type GateId = (typeof hotspotIds)[number];

/* ------------------------------------------------------------------ */
/* Composition constants                                               */
/* ------------------------------------------------------------------ */

interface GateSpec {
  id: GateId;
  /** Where the ribbon threads the gateway (root space). */
  pos: [number, number, number];
  w: number;
  h: number;
}

/** Centre gateway tallest (triptych); thresholds share a line, tops step. */
const GATE_SPECS: GateSpec[] = [
  { id: 'request', pos: [-1.56, -0.05, 0.1], w: 0.86, h: 1.22 },
  { id: 'route', pos: [0, 0.07, -0.05], w: 0.94, h: 1.46 },
  { id: 'resolve', pos: [1.56, 0.0, 0.03], w: 0.88, h: 1.32 },
];

const FRAME_BAR = 0.055; // glass bar width (before bevel)
const FRAME_DEPTH = 0.07;
const FRAME_BEVEL = 0.013;
const FRAME_BEVEL_DEPTH = 0.016;
/** Gateway geometry sits a little high so the ribbon passes through its body, not its crown. */
const GATE_LIFT = 0.07;
const SILL_H = 0.04;
const SILL_D = 0.22;
/** The legs stand this far into the sill (sill top above the leg ends). */
const SILL_SINK = 0.012;

const RIBBON_SEGMENTS = 420;
const RIBBON_WIDTH = 0.18;
const RIBBON_THICK = 0.022;
const CHANNEL_WIDTH = 0.028;

/**
 * Source / target docks the ribbon runs out of and into: small dark-ceramic
 * ports (the sills' and the family's rounded-block language) with a slit lamp.
 * DOCK_L runs along the ribbon, DOCK_W across it.
 */
const DOCK_L = 0.2;
const DOCK_W = 0.22;
const DOCK_H = 0.3;
const DOCK_EDGE = 0.04;

/** Ribbon control points (threading points are spliced in so it passes through each gateway). */
function ribbonPoints(): Vector3[] {
  const g = GATE_SPECS.map((s) => new Vector3(...s.pos));
  return [
    new Vector3(-2.45, -0.25, 0.3), // source dock
    new Vector3(-2.05, -0.18, 0.24),
    g[0],
    new Vector3(-0.78, 0.12, -0.1),
    g[1],
    new Vector3(0.78, -0.05, 0.02),
    g[2],
    new Vector3(2.05, 0.13, -0.08),
    new Vector3(2.45, 0.2, -0.14), // target dock
  ];
}

const PULSE_SPEED = 0.13; // ribbon lengths per second (≈7.5 s end to end)
const PULSE_GAP = 1.4; // seconds of rest between loops
const PULSE_LENGTH = 0.24;
const FLOW_INTENSITY = 1.4;
const FLOW_SETTLED = 1.0;
const GLOW_SIZE = 0.44;
const GLOW_TRAVEL = 0.62;
const GLOW_SETTLED = 0.3;
const STILL_TIME = 2.2; // fixed time for the still pose
/**
 * Still pulse: inside Route's opening, clear of both posts at every aspect
 * (the record is "being routed"), with its trail reaching back toward Request.
 */
const STILL_HEAD_OFFSET = 0.022;

/* ------------------------------------------------------------------ */
/* Small local helpers                                                 */
/* ------------------------------------------------------------------ */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** sRGB 0–1 components of a hex colour (for premultiplied custom shaders). */
function srgb(hex: number) {
  return new Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

/**
 * Gateway outline: an inverted U with a semicircular crown whose legs stand
 * in the sill (no bottom bar). Bounds x ∈ [-w/2, w/2], y ∈ [-h/2, h/2].
 */
function gatewayShape(w: number, h: number, bar: number) {
  const rt = w / 2;
  const ri = rt - bar;
  const yb = -h / 2;
  const yc = h / 2 - rt;
  const s = new Shape();
  s.moveTo(-rt, yb);
  s.lineTo(-ri, yb);
  s.lineTo(-ri, yc);
  s.absarc(0, yc, ri, Math.PI, 0, true);
  s.lineTo(ri, yb);
  s.lineTo(rt, yb);
  s.lineTo(rt, yc);
  s.absarc(0, yc, rt, 0, Math.PI, false);
  s.closePath();
  return s;
}

/** Centre line of the gateway bar, from sill to sill over the crown. */
function gatewayInlayPath(w: number, h: number, bar: number, yStart: number) {
  const r = w / 2 - bar / 2;
  const yc = h / 2 - w / 2;
  const p = new Path();
  p.moveTo(-r, yStart);
  p.lineTo(-r, yc);
  p.absarc(0, yc, r, Math.PI, 0, true);
  p.lineTo(r, yStart);
  return p;
}

const PREMULT_OVER = {
  transparent: true,
  depthWrite: false,
  blending: CustomBlending,
  blendSrc: OneFactor,
  blendDst: OneMinusSrcAlphaFactor,
  blendSrcAlpha: OneFactor,
  blendDstAlpha: OneMinusSrcAlphaFactor,
  toneMapped: false,
} as const;

const PREMULT_ADD = {
  transparent: true,
  depthWrite: false,
  blending: CustomBlending,
  blendSrc: OneFactor,
  blendDst: OneFactor,
  blendSrcAlpha: OneFactor,
  blendDstAlpha: OneFactor,
  toneMapped: false,
} as const;

/**
 * Soft glow written as premultiplied colour (rgb ≤ alpha) and blended "over"
 * (not added), so it tints what it covers toward mint instead of pushing a
 * bright ribbon highlight to white, and survives export to a transparent WebP. Camera-facing billboard;
 * the quad size comes from the PlaneGeometry, scaled by the mesh scale.
 */
function glowMaterial(hex: number, opacity: number) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: srgb(hex) }, uOpacity: { value: opacity }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uScale;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mv.xy += position.xy * uScale;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float g = exp(-r * r * 5.0) * (1.0 - smoothstep(0.75, 1.0, r));
        float a = g * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    ...PREMULT_OVER,
  });
}

/**
 * Light veil in a gateway's opening: hugs the inner edge of the frame and
 * pools faintly on the threshold, leaving the middle (where the ribbon
 * passes) nearly clear. Premultiplied additive like the glow.
 */
function veilMaterial(hex: number, w: number, h: number, rb: number) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: srgb(hex) },
      uStrength: { value: 0 },
      uSize: { value: new Vector3(w, h, rb) },
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
      uniform float uStrength;
      uniform vec3 uSize;
      varying vec2 vUv;
      // iq's rounded box with per-corner radii (tr, br, tl, bl)
      float sdRoundBox(vec2 p, vec2 b, vec4 r) {
        r.xy = (p.x > 0.0) ? r.xy : r.zw;
        r.x = (p.y > 0.0) ? r.x : r.y;
        vec2 q = abs(p) - b + r.x;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
      }
      void main() {
        vec2 b = uSize.xy * 0.5;
        vec2 p = (vUv - 0.5) * uSize.xy;
        float d = sdRoundBox(p, b, vec4(b.x, uSize.z, b.x, uSize.z));
        float inside = smoothstep(0.0, -0.008, d);
        float rim = exp(d * 16.0);
        float pool = pow(1.0 - vUv.y, 5.0);
        float a = clamp((rim * 0.3 + 0.005 + 0.06 * pool) * inside * uStrength, 0.0, 1.0);
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    side: DoubleSide,
    ...PREMULT_ADD,
  });
}

/**
 * The flow light: kit.flowMaterial (same uniforms, vertex stage and API) with
 * a fragment stage tuned for this sculpture:
 *  - softer trail falloff (trail^1.35 instead of trail²) plus a faint long wake,
 *    so the path the pulse has just covered stays readable;
 *  - premultiplied "over" blending instead of additive, so the light tints the
 *    groove toward mint and can never stack into white on a bright highlight.
 */
function ribbonFlowMaterial() {
  const m = flowMaterial({ length: PULSE_LENGTH, intensity: FLOW_INTENSITY, baseOpacity: 0 });
  m.fragmentShader = /* glsl */ `
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
      float front = 1.0 - smoothstep(0.0, 0.012, d);
      float trail = smoothstep(-uLength, 0.0, d) * front;
      float wake = smoothstep(-uLength * 2.2, 0.0, d) * front;
      return max(pow(trail, 1.35), 0.16 * wake);
    }
    void main() {
      float p = max(packet(uHead), packet(uHead2));
      float edge = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 3.0);
      float a = clamp(uBaseOpacity + p, 0.0, 1.0) * edge * uFade;
      vec3 col = mix(uBase, uColor * uIntensity, p / max(uBaseOpacity + p, 1e-4));
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
      gl_FragColor = vec4(gl_FragColor.rgb * a, a);
    }
  `;
  Object.assign(m, PREMULT_OVER);
  return m;
}

/**
 * Smoked glass for an alpha canvas. three.js clears the transmission buffer to
 * 50% white when the canvas is transparent, which makes thin glass look milky.
 * A backdrop (see `transmissionBackdrop`) fills that buffer with a dark,
 * part-transparent smoke instead, so the page reads through the glass darkened.
 * Thin and low-IOR so the ribbon seen through a post stays continuous (no jog),
 * and bright reflections raise alpha so they survive WebP export.
 */
const TRANSMISSION_ANCHOR = 'material.transmissionAlpha = mix(';
/**
 * What is seen through the glass is shown as the eye would see it in the open
 * (the Khronos PBR Neutral curve the renderer uses), then darkened by the
 * smoke. Without this, the satin ribbon's HDR highlights (the ice rim light in
 * particular) glow through the posts as saturated blue patches.
 */
const TRANSMISSION_PATCH = /* glsl */ `
  {
    vec3 c = transmitted.rgb;
    float pk = max(c.r, max(c.g, c.b));
    if (pk >= 0.76) {
      float np = 1.0 - 0.0576 / (pk - 0.52);
      c *= np / pk;
      c = mix(c, vec3(np), 1.0 - 1.0 / (0.15 * (pk - np) + 1.0));
    }
    // The ice rim light grazing the band's edges blurs into blue specks once
    // refracted; keep it out of what the smoke shows (mint is unaffected).
    float blueExcess = c.b - max(c.r, c.g);
    c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), clamp(blueExcess * 5.0, 0.0, 0.85));
    // Smoke darkens lit surfaces behind the glass; the dark smoke body itself is kept.
    transmitted.rgb = c * mix(1.0, 0.6, smoothstep(0.03, 0.25, pk));
  }
`;
const transmissionChunk = ShaderChunk.transmission_fragment.replace(
  TRANSMISSION_ANCHOR,
  TRANSMISSION_PATCH + TRANSMISSION_ANCHOR,
);
if (import.meta.env.DEV && transmissionChunk === ShaderChunk.transmission_fragment) {
  console.warn('[ribbon] transmission patch not applied (three.js transmission chunk changed)');
}

function gatewayGlass() {
  const m = materials.smokedGlass({
    thickness: 0.045,
    ior: 1.28,
    roughness: 0.08,
    attenuationColor: new Color(0x3a4a5e),
    attenuationDistance: 1.4,
    // Soft enough that the studio's light boxes read as streaks, not hard tiles.
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.8,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <transmission_fragment>', transmissionChunk)
      .replace(
        '#include <colorspace_fragment>',
        '#include <colorspace_fragment>\n\tgl_FragColor.a = max(gl_FragColor.a, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));',
      );
  };
  m.customProgramCacheKey = () => 'ribbon-gateway-glass';
  return m;
}

/**
 * Self-lit accent kept out of the transmission buffer: three.js only renders
 * opaque objects into it, so a (fully opaque) "transparent" material is drawn
 * normally but never smeared through the glass by refraction.
 */
function lamp(color: number, intensity: number) {
  const m = materials.illuminated(color, intensity);
  m.transparent = true;
  m.opacity = 1;
  m.depthWrite = true;
  return m;
}

/** Full-screen quad that only draws into the transmission buffer. */
function transmissionBackdrop(tint: Vector4) {
  const mat = new ShaderMaterial({
    uniforms: { uTint: { value: tint } },
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position.xy * 2.0, 1.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec4 uTint;
      void main() { gl_FragColor = uTint; }
    `,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.onBeforeRender = (r: WebGLRenderer) => {
    mat.colorWrite = r.getRenderTarget() !== null;
  };
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Ribbon geometry                                                     */
/* ------------------------------------------------------------------ */

/** Gentle roll (radians) of the band around its path; positive tilts the face up. */
const ribbonRoll = (s: number) => {
  const free = 0.3 + 0.7 * Math.sin(Math.PI * 2 * 0.95 * s - 1.2);
  // Near the docks the band levels out (face slightly up, toward the key
  // light) so it enters each port cleanly and never shows its mint-lit underside.
  return lerp(0.28, free, smooth(0, 0.17, s) * smooth(1, 0.83, s));
};
/** Soft narrowing into the docks (never to a point). */
const ribbonTaper = (s: number) => 0.68 + 0.32 * smooth(0, 0.12, s) * smooth(1, 0.88, s);

/**
 * A satin band with a stadium cross-section (flat faces, rounded edges) swept
 * along the curve, plus a fine engraved channel strip on both faces for the
 * flow light. uv.x runs 0→1 along the length on both.
 */
function buildRibbon(curve: CatmullRomCurve3) {
  const N = RIBBON_SEGMENTS;
  const HALF = 6; // points per rounded edge
  const RING = HALF * 2;
  const V = RING + 1; // + seam
  const pos = new Float32Array((N + 1) * V * 3);
  const nor = new Float32Array((N + 1) * V * 3);
  // Explicit tangents (along the length) so the brushed anisotropy runs cleanly
  // down the band; derivative-based tangents on a thin swept strip striate.
  const tan = new Float32Array((N + 1) * V * 4);
  const uv = new Float32Array((N + 1) * V * 2);
  const fpos = new Float32Array((N + 1) * 4 * 3);
  const fuv = new Float32Array((N + 1) * 4 * 2);
  const fnor = new Float32Array((N + 1) * 4 * 3);
  const centres = new Float32Array((N + 1) * 3);
  const faces = new Float32Array((N + 1) * 3);
  const widths = new Float32Array((N + 1) * 3);

  const P = new Vector3();
  const T = new Vector3();
  const N0 = new Vector3();
  const B0 = new Vector3();
  const W = new Vector3();
  const F = new Vector3();
  const up = new Vector3(0, 1, 0);
  const q = new Vector3();

  for (let i = 0; i <= N; i++) {
    const s = i / N;
    curve.getPointAt(s, P);
    curve.getTangentAt(s, T);
    N0.copy(up).addScaledVector(T, -up.dot(T)).normalize();
    B0.crossVectors(T, N0);
    const phi = ribbonRoll(s);
    W.copy(N0).multiplyScalar(Math.cos(phi)).addScaledVector(B0, -Math.sin(phi));
    F.crossVectors(T, W).normalize();
    const tau = ribbonTaper(s);
    const width = RIBBON_WIDTH * tau;
    const r = (RIBBON_THICK * (0.6 + 0.4 * tau)) / 2;
    const hw = Math.max(0, width / 2 - r);

    P.toArray(centres, i * 3);
    F.toArray(faces, i * 3);
    W.toArray(widths, i * 3);

    for (let k = 0; k <= RING; k++) {
      const kk = k % RING;
      let a: number;
      let cx: number;
      if (kk < HALF) {
        a = -Math.PI / 2 + (Math.PI * kk) / (HALF - 1);
        cx = hw + r * Math.cos(a);
      } else {
        a = Math.PI / 2 + (Math.PI * (kk - HALF)) / (HALF - 1);
        cx = -hw + r * Math.cos(a);
      }
      const cf = r * Math.sin(a);
      const o = (i * V + k) * 3;
      q.copy(P).addScaledVector(W, cx).addScaledVector(F, cf);
      q.toArray(pos, o);
      q.copy(W).multiplyScalar(Math.cos(a)).addScaledVector(F, Math.sin(a)).normalize();
      q.toArray(nor, o);
      const ot = (i * V + k) * 4;
      tan[ot] = T.x;
      tan[ot + 1] = T.y;
      tan[ot + 2] = T.z;
      tan[ot + 3] = 1;
      uv[(i * V + k) * 2] = s;
      uv[(i * V + k) * 2 + 1] = k / RING;
    }

    // Engraved channel: a narrow strip on each flat face, on the centre line.
    const sw = CHANNEL_WIDTH * 0.5 * (0.75 + 0.25 * tau);
    for (let side = 0; side < 2; side++) {
      const off = (side === 0 ? 1 : -1) * (r + 0.0016);
      for (let e = 0; e < 2; e++) {
        const o = i * 4 + side * 2 + e;
        q.copy(P)
          .addScaledVector(F, off)
          .addScaledVector(W, e === 0 ? -sw : sw);
        q.toArray(fpos, o * 3);
        q.copy(F).multiplyScalar(side === 0 ? 1 : -1);
        q.toArray(fnor, o * 3);
        fuv[o * 2] = s;
        fuv[o * 2 + 1] = e;
      }
    }
  }

  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < RING; k++) {
      const a = i * V + k;
      const b = (i + 1) * V + k;
      const c = (i + 1) * V + k + 1;
      const d = i * V + k + 1;
      idx.push(a, d, b, b, d, c);
    }
  }
  const body = new BufferGeometry();
  body.setAttribute('position', new BufferAttribute(pos, 3));
  body.setAttribute('normal', new BufferAttribute(nor, 3));
  body.setAttribute('tangent', new BufferAttribute(tan, 4));
  body.setAttribute('uv', new BufferAttribute(uv, 2));
  body.setIndex(idx);

  const fidx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let side = 0; side < 2; side++) {
      const a = i * 4 + side * 2;
      const b = (i + 1) * 4 + side * 2;
      fidx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const channel = new BufferGeometry();
  channel.setAttribute('position', new BufferAttribute(fpos, 3));
  channel.setAttribute('normal', new BufferAttribute(fnor, 3));
  channel.setAttribute('uv', new BufferAttribute(fuv, 2));
  channel.setIndex(fidx);

  return { body, channel, centres, faces, widths };
}

/* ------------------------------------------------------------------ */
/* Gateways                                                            */
/* ------------------------------------------------------------------ */

interface Gate {
  id: GateId;
  spec: GateSpec;
  group: Group;
  anchor: Object3D;
  glass: MeshPhysicalMaterial;
  inlay: MeshBasicMaterial;
  lamp: MeshBasicMaterial;
  veil: ShaderMaterial;
  baseY: number;
  phase: number;
  u: number;
  sel: number;
  hov: number;
  dim: number;
}

function buildGate(spec: GateSpec, sillMaterial: MeshPhysicalMaterial, index: number): Gate {
  const { w, h } = spec;
  const group = new Group();
  const body = new Group();
  body.position.y = GATE_LIFT * h;
  group.add(body);

  const yb = -h / 2;
  const sillTop = yb + SILL_SINK;

  // Smoked-glass gateway: an inverted U extruded with a soft bevel.
  const frameGeo = new ExtrudeGeometry(gatewayShape(w, h, FRAME_BAR), {
    depth: FRAME_DEPTH,
    bevelEnabled: true,
    bevelThickness: FRAME_BEVEL_DEPTH,
    bevelSize: FRAME_BEVEL,
    bevelSegments: 3,
    curveSegments: 20,
  });
  frameGeo.translate(0, 0, -FRAME_DEPTH / 2);
  // ExtrudeGeometry is flat-shaded: each facet of the arch would mirror the
  // studio's light boxes as a hard tile. Smooth across the arc and the bevel.
  const frameSmooth = toCreasedNormals(frameGeo, Math.PI / 3);
  if (frameSmooth !== frameGeo) frameGeo.dispose();
  const glass = gatewayGlass();
  body.add(new Mesh(frameSmooth, glass));

  // Illuminated inlay set into the glass's front face, on the bar's centre line.
  const pts = gatewayInlayPath(w, h, FRAME_BAR, sillTop).getSpacedPoints(160);
  const faceZ = FRAME_DEPTH / 2 + FRAME_BEVEL_DEPTH + 0.0004;
  const inlayCurve = new CatmullRomCurve3(
    pts.map((p) => new Vector3(p.x, p.y, faceZ)),
    false,
    'centripetal',
  );
  const inlay = lamp(PALETTE.ice, 0.3);
  body.add(new Mesh(new TubeGeometry(inlayCurve, 200, 0.0046, 6, false), inlay));

  // Veil of light in the opening (selection / pulse response).
  const iw = w - 2 * FRAME_BAR - 2 * FRAME_BEVEL;
  const top = h / 2 - FRAME_BAR - FRAME_BEVEL;
  const ih = top - sillTop;
  const veil = veilMaterial(PALETTE.mint, iw, ih, 0.004);
  const veilMesh = new Mesh(new PlaneGeometry(iw, ih), veil);
  veilMesh.position.y = (top + sillTop) / 2;
  veilMesh.renderOrder = 4;
  body.add(veilMesh);

  // Dark ceramic threshold the legs stand in, with a small status lamp.
  const sillW = w + 0.08;
  const sill = new Mesh(new RoundedBoxGeometry(sillW, SILL_H, SILL_D, 3, 0.016), sillMaterial);
  sill.position.y = sillTop - SILL_H / 2;
  body.add(sill);
  const lampMat = lamp(PALETTE.ice, 0.4);
  const lampMesh = new Mesh(new RoundedBoxGeometry(sillW * 0.28, 0.009, 0.006, 2, 0.003), lampMat);
  lampMesh.position.set(0, sill.position.y, SILL_D / 2 + 0.0005);
  body.add(lampMesh);

  // Where the HTML stage label sits: just above the crown.
  const anchor = new Object3D();
  anchor.position.set(0, h / 2 + 0.17, 0);
  body.add(anchor);

  group.position.set(...spec.pos);

  return {
    id: spec.id,
    spec,
    group,
    anchor,
    glass,
    inlay,
    lamp: lampMat,
    veil,
    baseY: spec.pos[1],
    phase: index * 2.1,
    u: 0,
    sel: 0,
    hov: 0,
    dim: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Docks (source system → target system)                               */
/* ------------------------------------------------------------------ */

interface Dock {
  group: Group;
  lamp: MeshBasicMaterial;
  /** Ribbon param where the band leaves / enters the dock's face. */
  mouth: number;
}

function buildDock(curve: CatmullRomCurve3, end: 0 | 1, material: MeshPhysicalMaterial, length: number): Dock {
  const group = new Group();
  group.position.copy(curve.getPointAt(end));
  // Local +X follows the ribbon's heading, so the band enters the inner face square on.
  const t = curve.getTangentAt(end);
  group.rotation.y = -Math.atan2(t.z, t.x);

  group.add(new Mesh(new RoundedBoxGeometry(DOCK_L, DOCK_H, DOCK_W, 4, DOCK_EDGE), material));

  // Slit lamp on the outward face, low, like the gateway sill lamps.
  const lampMat = lamp(PALETTE.ice, 0.4);
  const slit = new Mesh(new RoundedBoxGeometry(DOCK_L * 0.46, 0.009, 0.006, 2, 0.003), lampMat);
  slit.position.set(0, -DOCK_H / 2 + 0.07, DOCK_W / 2 + 0.0005);
  group.add(slit);

  const inset = (DOCK_L / 2 + 0.004) / length;
  return { group, lamp: lampMat, mouth: end === 0 ? inset : 1 - inset };
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function create(opts: SceneOptions): SceneHandle {
  const { canvas, container, still = false } = opts;
  const renderer = createRenderer(canvas, opts.maxDpr ?? 1.75, still);
  const scene = new Scene();
  applyStudioEnvironment(renderer, scene, 0.7);
  const rig = addLightRig(scene);
  // A touch less mint fill than the shared rig: on a long metal band it reads
  // as a verdigris cast and competes with the pulse as the meaningful colour.
  rig.fill.intensity = 1.0;

  const camera = new PerspectiveCamera(28, 1, 0.5, 40);
  const root = new Group();
  scene.add(root);
  // Dark smoke behind the glass (linear, premultiplied).
  scene.add(transmissionBackdrop(new Vector4(0.024, 0.026, 0.03, 0.3)));

  /* Ribbon ------------------------------------------------------------ */
  const curve = new CatmullRomCurve3(ribbonPoints(), false, 'centripetal');
  curve.arcLengthDivisions = 1600;
  const curveLength = curve.getLength();
  const band = buildRibbon(curve);
  const ribbon = new Mesh(
    band.body,
    materials.satinMetal({
      color: 0x666e78,
      roughness: 0.42,
      clearcoat: 0.12,
      anisotropy: 0.6,
      envMapIntensity: 0.7,
    }),
  );
  root.add(ribbon);

  // Fine engraved channel, one value step below the ribbon: the light runs inside it.
  const groove = new Mesh(
    band.channel,
    materials.satinMetal({
      color: 0x464d57,
      roughness: 0.5,
      clearcoat: 0,
      envMapIntensity: 0.75,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    }),
  );
  groove.renderOrder = 1;
  root.add(groove);
  const flow = ribbonFlowMaterial();
  // Draw the light in the opaque pass so the glass transmission sees it too.
  flow.transparent = false;
  flow.polygonOffset = true;
  flow.polygonOffsetFactor = -2;
  flow.polygonOffsetUnits = -8;
  const channel = new Mesh(band.channel, flow);
  channel.renderOrder = 2;
  root.add(channel);

  const headGlowMat = glowMaterial(PALETTE.mint, GLOW_TRAVEL);
  headGlowMat.transparent = false; // opaque pass → visible through glass
  const headGlow = new Mesh(new PlaneGeometry(GLOW_SIZE, GLOW_SIZE), headGlowMat);
  headGlow.renderOrder = 3;
  headGlow.frustumCulled = false;
  root.add(headGlow);

  /* Docks ------------------------------------------------------------- */
  // Sills: a touch less sheen than the kit default so their broad top faces
  // read as dark glazed ceramic, not light grey trays.
  const ceramic = materials.darkCeramic({ envMapIntensity: 0.55, clearcoatRoughness: 0.3 });
  const dockMaterial = materials.darkCeramic({ color: PALETTE.ceramicLight, roughness: 0.42 });
  const docks = [buildDock(curve, 0, dockMaterial, curveLength), buildDock(curve, 1, dockMaterial, curveLength)];
  for (const d of docks) root.add(d.group);
  const [source, target] = docks;

  /* Gateways ---------------------------------------------------------- */
  const gates = GATE_SPECS.map((spec, i) => buildGate(spec, ceramic, i));
  const gateById = new Map<string, Gate>();
  const centres = band.centres;
  const faces = band.faces;
  const N = RIBBON_SEGMENTS;
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const tmpC = new Vector3();
  const yAxis = new Vector3(0, 1, 0);

  for (const g of gates) {
    gateById.set(g.id, g);
    // Param of the nearest ribbon sample to the threading point.
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= N; i++) {
      tmpA.fromArray(centres, i * 3);
      const d = tmpA.distanceToSquared(g.group.position);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    g.u = best / N;
    // Turn the gateway partly toward the viewer: its normal is the ribbon's
    // heading turned 40° toward +Z, so the band threads it at an angle.
    curve.getTangentAt(g.u, tmpA);
    const heading = Math.atan2(tmpA.z, tmpA.x) + 0.7;
    g.group.rotation.y = Math.atan2(Math.cos(heading), Math.sin(heading));
    root.add(g.group);
  }

  // Satin collar where the band enters each dock: a fitting, not a cut.
  const collarMat = materials.satinMetal({ color: 0x4a525c, roughness: 0.45, envMapIntensity: 0.8 });
  const basis = new Matrix4();
  for (const d of docks) {
    const i = Math.round(d.mouth * N);
    const s = i / N;
    const collar = new Mesh(
      new RoundedBoxGeometry(0.03, RIBBON_WIDTH * ribbonTaper(s) + 0.028, RIBBON_THICK + 0.024, 2, 0.009),
      collarMat,
    );
    curve.getTangentAt(s, tmpA);
    basis.makeBasis(tmpA, tmpB.fromArray(band.widths, i * 3), tmpC.fromArray(faces, i * 3));
    collar.quaternion.setFromRotationMatrix(basis);
    collar.position.fromArray(centres, i * 3);
    root.add(collar);
  }

  /* Ground shadows ---------------------------------------------------- */
  const floorY = -1.0;
  const longShadow = contactShadow(5.6, 1.4, 0.28);
  longShadow.position.set(0, floorY, 0);
  root.add(longShadow);
  for (const g of gates) {
    const s = contactShadow(g.spec.w * 1.7, 0.8, 0.42);
    s.position.set(g.group.position.x, floorY + 0.002, g.group.position.z);
    s.rotation.z = g.group.rotation.y;
    root.add(s);
  }
  for (const d of docks) {
    const s = contactShadow(0.62, 0.5, 0.3);
    s.position.set(d.group.position.x, floorY + 0.003, d.group.position.z);
    s.rotation.z = d.group.rotation.y;
    root.add(s);
  }

  /* Camera framing ---------------------------------------------------- */
  // Points the frame must contain (root space, rest pose): ribbon samples,
  // dock corners, gateway outlines and label anchors (+ room for the label).
  root.updateMatrixWorld(true);
  const fitPoints: Vector3[] = [];
  for (let i = 0; i <= N; i += 12) fitPoints.push(new Vector3().fromArray(centres, i * 3));
  fitPoints.push(new Vector3().fromArray(centres, N * 3));
  for (const d of docks) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          fitPoints.push(d.group.localToWorld(new Vector3((sx * DOCK_L) / 2, (sy * DOCK_H) / 2, (sz * DOCK_W) / 2)));
        }
      }
    }
  }
  for (const g of gates) {
    const { w, h } = g.spec;
    const lift = GATE_LIFT * h;
    const ys = lift - h / 2 + SILL_SINK - SILL_H;
    for (const [x, y, z] of [
      [-w / 2 - 0.04, ys, SILL_D / 2],
      [w / 2 + 0.04, ys, SILL_D / 2],
      [-w / 2 - 0.04, ys, -SILL_D / 2],
      [w / 2 + 0.04, ys, -SILL_D / 2],
      [-w / 2, lift + h / 2 - w / 2, 0],
      [w / 2, lift + h / 2 - w / 2, 0],
      [0, lift + h / 2 + 0.17 + 0.16, 0],
    ]) {
      fitPoints.push(g.group.localToWorld(new Vector3(x, y, z)));
    }
  }
  const camTarget = new Vector3();
  const camDir = new Vector3();
  const camRight = new Vector3();
  const camUp = new Vector3();

  function frame(w: number, h: number) {
    const aspect = w / h;
    const k = clamp01((aspect - 1) / 0.6); // 0 at 1:1 → 1 at 16:10
    const az = lerp(0.86, 0.26, k);
    const el = lerp(0.4, 0.16, k);
    camDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    camRight.crossVectors(yAxis, camDir).normalize();
    camUp.crossVectors(camDir, camRight);
    const ty = Math.tan((camera.fov * Math.PI) / 360);
    const tx = ty * aspect;
    const mx = aspect <= 1.1 ? 1.22 : lerp(1.2, 1.18, k);
    const my = 1.12;
    camTarget.set(0, 0, 0);
    let dist = 8;
    for (let iter = 0; iter < 4; iter++) {
      // Distance so every point fits within the margins around camTarget.
      dist = 0;
      for (const p of fitPoints) {
        tmpA.subVectors(p, camTarget);
        const x = Math.abs(tmpA.dot(camRight));
        const y = Math.abs(tmpA.dot(camUp));
        const z = tmpA.dot(camDir);
        dist = Math.max(dist, (x * mx) / tx + z, (y * my) / ty + z);
      }
      // Re-centre on the projected bounds.
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of fitPoints) {
        tmpA.subVectors(p, camTarget);
        const depth = dist - tmpA.dot(camDir);
        const sx = tmpA.dot(camRight) / depth;
        const sy = tmpA.dot(camUp) / depth;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }
      camTarget.addScaledVector(camRight, ((minX + maxX) / 2) * dist).addScaledVector(camUp, ((minY + maxY) / 2) * dist);
    }
    camera.position.copy(camTarget).addScaledVector(camDir, dist);
    camera.lookAt(camTarget);
  }

  let stillDrawn = false;
  const stopResize = autoResize(renderer, container, camera, (w, h) => {
    frame(w, h);
    // Keep the still frame in sync with container size changes.
    if (still && stillDrawn) queueMicrotask(renderStill);
  });

  /* State ------------------------------------------------------------- */
  const pointer = pointerTracker(container, !still);
  const zeroPointer = { x: 0, y: 0 };
  let selectedId: string | null = null;
  let hoveredId: string | null = null;

  const route = gateById.get('route')!;
  const stillHead = route.u + STILL_HEAD_OFFSET;
  const pulse = { head: stillHead, fade: 1, gap: 0, restarting: false, settled: 0 };
  // Live starts exactly where the still image is, so the swap is seamless.
  route.hov = 1;

  const COL_ICE = new Color(PALETTE.ice);
  const COL_MINT = new Color(PALETTE.mint);
  const colA = new Color();
  const colB = new Color();
  const flowIntensity = flow.uniforms.uIntensity;
  const flowHead = flow.uniforms.uHead;
  const flowFade = flow.uniforms.uFade;
  const glowOpacity = headGlowMat.uniforms.uOpacity;
  const glowScale = headGlowMat.uniforms.uScale;

  let snap = false;
  let frameDt = 0;
  let hoverAny = 0;
  const approach = (cur: number, target: number, lambda: number) =>
    snap ? target : ease.damp(cur, target, lambda, frameDt);

  /** Pulse slows softly inside each gateway — the step being "processed". */
  function speedAt(s: number, slowdown: number) {
    let k = 1;
    for (let i = 0; i < gates.length; i++) {
      const d = (s - gates[i].u) / 0.035;
      k -= slowdown * Math.exp(-d * d);
    }
    return Math.max(k, 0.25);
  }

  function stepPulse(dt: number) {
    const target = selectedId ? gateById.get(selectedId)!.u + 0.006 : -1;
    if (target < 0) {
      // Loop through all three gateways, dock to dock.
      pulse.settled = approach(pulse.settled, 0, 3);
      pulse.restarting = false;
      if (pulse.gap > 0) {
        pulse.gap -= dt;
        if (pulse.gap <= 0) pulse.head = 0;
        return;
      }
      pulse.fade = approach(pulse.fade, 1, 4);
      pulse.head += PULSE_SPEED * speedAt(pulse.head, 0.6) * dt;
      if (pulse.head > 1 + PULSE_LENGTH) pulse.gap = PULSE_GAP;
      return;
    }
    // Travel to the selected gateway and settle there. If the pulse is already
    // past it, fade it out and send a fresh one from the source dock.
    if (pulse.restarting || pulse.head > target + 0.003 || pulse.gap > 0) {
      pulse.restarting = true;
      pulse.settled = approach(pulse.settled, 0, 8);
      pulse.fade = approach(pulse.fade, 0, 12);
      if (pulse.fade < 0.03 || pulse.gap > 0) {
        pulse.head = 0;
        pulse.gap = 0;
        pulse.restarting = false;
      }
      return;
    }
    pulse.fade = approach(pulse.fade, 1, 6);
    const remaining = target - pulse.head;
    // Brisk when far (a click should be answered within ~2 s), easing in.
    const speed = PULSE_SPEED * 2.2 * (1 + 1.3 * smooth(0.1, 0.45, remaining)) * speedAt(pulse.head, 0.25);
    const step = speed * dt * Math.min(1, Math.max(0.1, remaining / 0.06));
    pulse.head = Math.min(target, pulse.head + step);
    pulse.settled = approach(pulse.settled, remaining < 0.002 ? 1 : 0, 3);
  }

  function update(t: number, dt: number) {
    frameDt = dt;
    const p = snap ? zeroPointer : pointer.update(0.06);

    // Ambient sway (a few degrees) + gentle pointer response.
    const ry = Math.sin(t * 0.16) * 0.035 + p.x * 0.1;
    const rx = Math.sin(t * 0.11 + 1.3) * 0.01 + p.y * 0.04;
    root.rotation.y = approach(root.rotation.y, ry, 2.5);
    root.rotation.x = approach(root.rotation.x, rx, 2.5);

    // Pulse.
    if (snap) {
      pulse.head = selectedId ? gateById.get(selectedId)!.u + 0.006 : stillHead;
      pulse.fade = 1;
      pulse.gap = 0;
      pulse.restarting = false;
      pulse.settled = selectedId ? 1 : 0;
    } else {
      stepPulse(dt);
    }
    const head = pulse.head;
    const live = pulse.gap > 0 ? 0 : pulse.fade;
    const settled = pulse.settled;
    flowHead.value = head;
    flowFade.value = pulse.fade;
    flowIntensity.value =
      lerp(FLOW_INTENSITY, FLOW_SETTLED, settled) * (1 - 0.12 * settled * (0.5 + 0.5 * Math.sin(t * 1.7)));

    // Head glow rides the channel; it fades out as the head enters a dock.
    const hs = clamp01(head);
    const fi = hs * N;
    const i0 = Math.min(N - 1, Math.floor(fi));
    const ft = fi - i0;
    tmpA.fromArray(centres, i0 * 3).lerp(tmpB.fromArray(centres, i0 * 3 + 3), ft);
    tmpC.fromArray(faces, i0 * 3).lerp(tmpB.fromArray(faces, i0 * 3 + 3), ft);
    headGlow.position.copy(tmpA).addScaledVector(tmpC, 0.03);
    const outOfDocks =
      head >= 0 && head <= 1
        ? smooth(source.mouth - 0.004, source.mouth + 0.05, hs) * smooth(target.mouth + 0.004, target.mouth - 0.06, hs)
        : 0;
    glowOpacity.value = lerp(GLOW_TRAVEL, GLOW_SETTLED, settled) * live * outOfDocks;
    glowScale.value = lerp(1, 0.86, settled);

    // Docks answer as the pulse leaves the source and arrives at the target.
    {
      const ds = head - source.mouth;
      const sendAct = (ds < 0 ? smooth(-0.04, 0, ds) : Math.exp(-((ds / 0.06) ** 2))) * live;
      const dt2 = head - target.mouth;
      const recvAct = (dt2 < 0 ? Math.exp(-((dt2 / 0.03) ** 2)) : Math.exp(-((dt2 / 0.16) ** 2))) * live;
      colB.copy(COL_MINT).multiplyScalar(1.1);
      source.lamp.color.copy(colA.copy(COL_ICE).multiplyScalar(0.32).lerp(colB, 0.75 * sendAct));
      target.lamp.color.copy(colA.copy(COL_ICE).multiplyScalar(0.32).lerp(colB, 0.75 * recvAct));
    }

    // Gateways: float, then answer selection / hover / the passing pulse.
    const anySelected = selectedId !== null;
    const restingEmphasis = snap && !selectedId && !hoveredId;
    // While a stage button is hovered, the passing pulse lights the other
    // gateways only faintly, so the hovered one always reads first.
    hoverAny = approach(hoverAny, hoveredId ? 1 : 0, 6);
    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      g.group.position.y = g.baseY + Math.sin(t * 0.5 + g.phase) * 0.012;
      const isSel = selectedId === g.id ? 1 : 0;
      const isHov = hoveredId === g.id || (restingEmphasis && g.id === 'route') ? 1 : 0;
      g.sel = approach(g.sel, isSel, 4);
      g.hov = approach(g.hov, isHov, 6);
      g.dim = approach(g.dim, anySelected && !isSel ? 1 : 0, 4);

      const d = head - g.u;
      const act = (d < 0 ? Math.exp(-((d / 0.03) ** 2)) : Math.exp(-((d / 0.11) ** 2))) * live;
      const pass = act * (1 - 0.6 * hoverAny * (1 - g.hov));
      const e = Math.max(g.sel, 0.62 * g.hov, 0.55 * pass);
      const dimK = 1 - 0.45 * g.dim;

      colB.copy(COL_MINT).multiplyScalar(1.1);
      g.inlay.color.copy(colA.copy(COL_ICE).multiplyScalar(0.3).lerp(colB, e).multiplyScalar(dimK));
      colB.copy(COL_MINT).multiplyScalar(1.25);
      g.lamp.color.copy(colA.copy(COL_ICE).multiplyScalar(0.3).lerp(colB, e).multiplyScalar(dimK));
      g.veil.uniforms.uStrength.value = Math.min(1, 0.85 * g.sel + 0.35 * g.hov + 0.22 * pass) * dimK;
      g.glass.envMapIntensity = 1.8 * (1 - 0.25 * g.dim) + 0.2 * g.sel;
    }
  }

  const hotspotEntries: [string, Object3D][] = gates.map((g) => [g.id, g.anchor]);
  function draw() {
    renderer.render(scene, camera);
    opts.onHotspots?.(projectHotspots(camera, hotspotEntries));
  }

  let readySent = false;
  function ready() {
    if (readySent) return;
    readySent = true;
    opts.onReady?.();
  }

  const loop = createLoop(
    renderer,
    (t, dt) => {
      snap = false;
      update(t + STILL_TIME, dt);
      draw();
      ready();
    },
    opts.onSlow,
  );

  function renderStill() {
    snap = true;
    update(STILL_TIME, 1);
    snap = false;
    draw();
    stillDrawn = true;
    ready();
  }

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    renderStill,
    setSelected(id) {
      selectedId = id && gateById.has(id) ? id : null;
    },
    setHovered(id) {
      hoveredId = id && gateById.has(id) ? id : null;
    },
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
