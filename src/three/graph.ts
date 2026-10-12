/**
 * Conversation Graph — the interactive demo's live state machine.
 *
 * Six small dark-ceramic pucks stand on satin-metal feet on a thin ceramic
 * plinth, read left → right: greeting → intent → (clarify | next step), with
 * fallback branching off in front and handoff as the exit on the right. Fine
 * satin-metal rails join them along soft curves. Each puck carries a thin
 * illuminated inlay in its state accent, dim until the conversation reaches it.
 *
 * When the host moves the conversation (setSelected), a small light packet
 * travels along the rail from the previous state to the new one (or over a
 * soft arc when no rail joins them), carrying a little pool of light across
 * the plinth. On arrival the puck lifts off its foot, its inlay comes up to
 * full and one ring ripples out from its base; the previous state stays lit
 * as a visited trail and the travelled rail keeps a faint shimmer.
 *
 * Visitors can turn the plinth (kit.dragRotate) and tap a puck to pick that
 * state (opts.onPick).
 */
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  QuadraticBezierCurve3,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Intersection,
  type Object3D,
  type Sprite,
} from 'three';
import {
  addLightRig,
  applyStudioEnvironment,
  autoResize,
  contactShadow,
  createLoop,
  createRenderer,
  disposeObject,
  dragRotate,
  glowSprite,
  materials,
  PALETTE,
} from './kit';
import type { HotspotMap, SceneHandle, SceneOptions } from './types';

export const hotspotIds = ['greeting', 'intent', 'clarify', 'resolve', 'fallback', 'handoff'] as const;
type NodeId = (typeof hotspotIds)[number];

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const R = 0.195; // puck radius
const FOOT = 0.022; // satin-metal foot height (pucks stand on it)
const RAIL_Y = 0.03; // rail centre height above the plinth top
const RAIL_R = 0.0105;

interface NodeSpec {
  id: NodeId;
  x: number;
  z: number;
  /** Puck height: rises gently along the flow. */
  h: number;
  color: number;
}

// x → reading order; z < 0 is further back (higher on screen), z > 0 in front.
const NODES: NodeSpec[] = [
  { id: 'greeting', x: -1.62, z: -0.08, h: 0.17, color: 0xe4e9ef },
  { id: 'intent', x: -0.62, z: -0.3, h: 0.21, color: 0x8dbeff },
  { id: 'clarify', x: 0.04, z: -0.9, h: 0.24, color: 0xf0d58c },
  { id: 'resolve', x: 0.68, z: 0.18, h: 0.27, color: 0x8ef0cc },
  { id: 'fallback', x: -0.94, z: 0.84, h: 0.15, color: 0xa5afbd },
  { id: 'handoff', x: 1.6, z: -0.32, h: 0.3, color: 0xf5a58f },
];
const N = NODES.length;
const IDX: Record<string, number> = {};
NODES.forEach((n, i) => (IDX[n.id] = i));
const GREETING = 0;
const indexOf = (id: string | null) => (id ? hotspotIds.indexOf(id as NodeId) : -1);

/** [from, to, bend] — bend pushes the curve's control point sideways (+ = toward the viewer for rightward rails). */
const EDGES: [NodeId, NodeId, number][] = [
  ['greeting', 'intent', -0.1],
  ['greeting', 'fallback', 0.14],
  ['fallback', 'intent', 0.12],
  ['intent', 'clarify', -0.14],
  ['intent', 'resolve', 0.08],
  ['clarify', 'resolve', -0.14],
  ['clarify', 'handoff', -0.14],
  ['fallback', 'handoff', 0.3],
  ['resolve', 'handoff', 0.1],
];

/** Still-mode trails: the short story each still frame tells (current state last). */
const STILL_TRAILS: Record<string, NodeId[]> = {
  greeting: ['greeting'],
  intent: ['greeting', 'intent'],
  clarify: ['greeting', 'intent', 'clarify'],
  resolve: ['greeting', 'intent', 'resolve'],
  fallback: ['greeting', 'fallback'],
  handoff: ['greeting', 'intent', 'clarify', 'handoff'],
};
const STILL_DEFAULT = 'resolve';

const TRAVEL = 0.72; // seconds for a packet to cross
const VISITED = 0.45; // brightness kept by visited states
const CALM = 0.5; // greeting brightness when nothing is selected
const EDGE_TRAIL = 0.3; // steady glow on travelled rails
const LIFT = 0.055; // fraction of a puck's height it rises on arrival
const HOVER_LIFT = 0.035;
const LABEL_PX = 21; // label centre sits this many CSS px above the puck's top
const REST_YAW = -0.06;

/* ------------------------------------------------------------------ */
/* Geometry + materials                                                */
/* ------------------------------------------------------------------ */

function roundedRect(w: number, d: number, r: number) {
  const s = new Shape();
  const x0 = -w / 2;
  const y0 = -d / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + d - r);
  s.quadraticCurveTo(x0 + w, y0 + d, x0 + w - r, y0 + d);
  s.lineTo(x0 + r, y0 + d);
  s.quadraticCurveTo(x0, y0 + d, x0, y0 + d - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/** Flat slab lying in XZ whose top face is at y = 0. */
function slabXZ(w: number, d: number, r: number, depth: number, bevel: number) {
  const g = new ExtrudeGeometry(roundedRect(w, d, r), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 14,
  });
  g.rotateX(-Math.PI / 2); // extrusion axis → +y
  g.translate(0, -(depth + bevel), 0);
  return g;
}

/** Puck: vertical wall, soft 0.05 shoulder, crisp little bottom round. Base at y = 0. */
function puckGeometry(h: number) {
  const pts: Vector2[] = [new Vector2(0.0001, 0), new Vector2(R - 0.012, 0)];
  const rb = 0.012;
  for (let k = 1; k <= 4; k++) {
    const a = -Math.PI / 2 + (k / 4) * (Math.PI / 2);
    pts.push(new Vector2(R - rb + rb * Math.cos(a), rb + rb * Math.sin(a)));
  }
  const rr = 0.05;
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * (Math.PI / 2);
    pts.push(new Vector2(R - rr + rr * Math.cos(a), h - rr + rr * Math.sin(a)));
  }
  pts.push(new Vector2(0.0001, h));
  return new LatheGeometry(pts, 56);
}

/**
 * Rail glow: a soft additive sleeve around each rail. uv.x runs along the
 * rail. A packet (uHead, travelling in uDir) plus a steady, slowly
 * shimmering glow (uLit) for rails the conversation has used.
 */
function railGlowMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(PALETTE.mint) },
      uHead: { value: -1 },
      uDir: { value: 1 },
      uLength: { value: 0.28 },
      uLit: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vNdv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vNdv = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uHead;
      uniform float uDir;
      uniform float uLength;
      uniform float uLit;
      uniform float uTime;
      varying vec2 vUv;
      varying float vNdv;
      void main() {
        float p = 0.0;
        if (uHead > -0.5) {
          float d = (vUv.x - uHead) * uDir;
          float tr = smoothstep(-uLength, 0.0, d) * (1.0 - smoothstep(0.0, 0.015, d));
          p = tr * tr;
        }
        float shimmer = 0.7 + 0.3 * sin(vUv.x * 11.0 - uTime * 1.1);
        float a = (p * 1.5 + uLit * shimmer) * pow(vNdv, 1.3);
        gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

interface NodeParts {
  spec: NodeSpec;
  lift: Group; // puck + inlay + glow; rises on arrival / hover
  inlay: MeshBasicMaterial;
  seam: MeshBasicMaterial;
  glow: Sprite;
  ripple: Mesh<RingGeometry, MeshBasicMaterial>;
  proxy: Mesh;
  accent: Color;
}

export function create(opts: SceneOptions): SceneHandle {
  const { canvas, container, still = false } = opts;
  const renderer = createRenderer(canvas, opts.maxDpr ?? 1.75, still);
  const scene = new Scene();
  applyStudioEnvironment(renderer, scene, 0.55);
  const rig = addLightRig(scene);
  rig.key.intensity = 1.7;
  rig.rim.intensity = 1.2;
  rig.fill.intensity = 0.6;

  const camera = new PerspectiveCamera(28, 1, 0.1, 60);
  const turn = new Group(); // sway + drag
  const body = new Group(); // grab lift
  scene.add(turn);
  turn.add(body);

  /* --- plinth ------------------------------------------------------ */
  const PW = 4.15;
  const PD = 2.5;
  const plinth = new Mesh(
    slabXZ(PW, PD, 0.34, 0.05, 0.014),
    materials.darkCeramic({ color: 0x1a2029, roughness: 0.62, clearcoat: 0.22, clearcoatRoughness: 0.5, envMapIntensity: 0.5 }),
  );
  const basePlate = new Mesh(
    slabXZ(PW + 0.05, PD + 0.05, 0.36, 0.014, 0),
    materials.satinMetal({ color: PALETTE.metalDark, roughness: 0.4, envMapIntensity: 0.8 }),
  );
  basePlate.position.y = -0.064;
  body.add(plinth, basePlate);
  const shadow = contactShadow(PW * 1.18, PD * 1.3, 0.62);
  shadow.position.y = -0.085;
  turn.add(shadow);

  /* --- nodes ------------------------------------------------------- */
  const pos = (i: number, y: number, out: Vector3) => out.set(NODES[i].x, y, NODES[i].z);
  const ceramic = materials.darkCeramic({ color: 0x151a22, roughness: 0.42, clearcoat: 0.85, clearcoatRoughness: 0.16 });
  const footMat = materials.satinMetal({ color: 0xa3aab3, roughness: 0.36 });
  const footGeo = new CylinderGeometry(R + 0.03, R + 0.036, FOOT, 56);
  const proxyMat = new MeshBasicMaterial();
  proxyMat.visible = false;
  const nodes: NodeParts[] = NODES.map((spec, i) => {
    const g = new Group();
    g.position.set(spec.x, 0, spec.z);
    const foot = new Mesh(footGeo, footMat);
    foot.position.y = FOOT / 2;
    const lift = new Group();
    lift.position.y = FOOT;
    const puck = new Mesh(puckGeometry(spec.h), ceramic);
    const accent = new Color(spec.color);
    const inlayMat = new MeshBasicMaterial({ color: accent.clone(), toneMapped: false });
    const inlay = new Mesh(new RingGeometry(R * 0.5, R * 0.6, 64), inlayMat);
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.y = spec.h + 0.0012;
    const glow = glowSprite(spec.color, 0.5, 0);
    glow.position.y = spec.h + 0.03;
    glow.renderOrder = 3;
    lift.add(puck, inlay, glow);
    // a thin line of light where the puck parts from its foot when it lifts
    const seamMat = new MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const seam = new Mesh(new TorusGeometry(R - 0.004, 0.0045, 6, 64), seamMat);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = FOOT + 0.002;
    seam.renderOrder = 2;
    const ripple = new Mesh(
      new RingGeometry(R + 0.045, R + 0.062, 72),
      new MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.002;
    ripple.visible = false;
    ripple.renderOrder = 1;
    const proxy = new Mesh(new CylinderGeometry(R + 0.07, R + 0.07, spec.h + 0.24, 16), proxyMat);
    proxy.position.y = (spec.h + 0.24) / 2 - 0.02;
    proxy.userData.index = i;
    g.add(foot, lift, seam, ripple, proxy);
    body.add(g);
    return { spec, lift, inlay: inlayMat, seam: seamMat, glow, ripple, proxy, accent };
  });
  const proxies: Object3D[] = nodes.map((n) => n.proxy);

  /* --- rails ------------------------------------------------------- */
  const railMat = materials.satinMetal({ color: 0xaeb5be, roughness: 0.3 });
  const a = new Vector3();
  const b = new Vector3();
  const edgeFrom: number[] = [];
  const edgeTo: number[] = [];
  const edgeLen: number[] = [];
  const edgeCurves: QuadraticBezierCurve3[] = [];
  const edgeMats: ShaderMaterial[] = [];
  for (const [f, t, bend] of EDGES) {
    const i = IDX[f];
    const j = IDX[t];
    pos(i, RAIL_Y, a);
    pos(j, RAIL_Y, b);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const c = new Vector3((a.x + b.x) / 2 + (-dz / len) * bend * len, RAIL_Y, (a.z + b.z) / 2 + (dx / len) * bend * len);
    const curve = new QuadraticBezierCurve3(a.clone(), c, b.clone());
    const rail = new Mesh(new TubeGeometry(curve, 72, RAIL_R, 8, false), railMat);
    const glowMat = railGlowMaterial();
    const glow = new Mesh(new TubeGeometry(curve, 72, RAIL_R * 2.6, 10, false), glowMat);
    glow.renderOrder = 2;
    body.add(rail, glow);
    edgeFrom.push(i);
    edgeTo.push(j);
    edgeLen.push(curve.getLength());
    edgeCurves.push(curve);
    edgeMats.push(glowMat);
  }
  const E = EDGES.length;
  const findEdge = (from: number, to: number) => {
    for (let e = 0; e < E; e++) {
      if (edgeFrom[e] === from && edgeTo[e] === to) return e;
      if (edgeFrom[e] === to && edgeTo[e] === from) return -(e + 2); // reversed
    }
    return -1;
  };

  /* --- travelling packet ------------------------------------------ */
  const TRAIL = 5;
  const beadCoreMat = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0 });
  const beadCore = new Mesh(new SphereGeometry(0.017, 16, 10), beadCoreMat);
  beadCore.renderOrder = 4;
  const beadGlows: Sprite[] = [];
  for (let k = 0; k <= TRAIL; k++) {
    const s = glowSprite(PALETTE.mint, k === 0 ? 0.2 : 0.13 - k * 0.012, 0);
    s.material.depthTest = false;
    s.renderOrder = 5;
    beadGlows.push(s);
    body.add(s);
  }
  body.add(beadCore);
  const travelLight = new PointLight(PALETTE.mint, 0, 1.1, 2);
  body.add(travelLight);
  const arc = new QuadraticBezierCurve3(new Vector3(), new Vector3(), new Vector3());

  /* --- state ------------------------------------------------------- */
  const lit = new Float32Array(N);
  const litT = new Float32Array(N);
  const hov = new Float32Array(N);
  const land = new Float32Array(N); // 0…1 lifted on arrival
  const press = new Float32Array(N);
  const rippleT = new Float32Array(N).fill(-1);
  const eLit = new Float32Array(E);
  const eLitT = new Float32Array(E);
  const tr = { active: false, from: 0, to: 0, edge: -1, reverse: false, u: 0, inU: 0.1, alpha: 0 };
  const st = {
    selected: null as string | null,
    current: -1, // index of the state the conversation is in (-1 = calm)
    landed: -1, // the puck currently lifted
    hostHover: -1,
    pickHover: -1,
  };
  const lightCol = new Color(PALETTE.mint);
  const lightPos = new Vector3(NODES[0].x, 0.35, NODES[0].z);
  const lightTarget = new Vector3().copy(lightPos);
  let lightLevel = 0;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  function calm() {
    litT.fill(0);
    eLitT.fill(0);
    litT[GREETING] = CALM;
    st.current = -1;
    st.landed = -1;
  }
  calm();

  function startTravel(from: number, to: number) {
    const found = findEdge(from, to);
    tr.active = true;
    tr.from = from;
    tr.to = to;
    tr.u = 0;
    if (found === -1) {
      // no rail between them: a soft arc over the plinth, top to top
      tr.edge = -1;
      tr.reverse = false;
      pos(from, FOOT + NODES[from].h, arc.v0);
      pos(to, FOOT + NODES[to].h, arc.v2);
      const span = arc.v0.distanceTo(arc.v2);
      arc.v1.addVectors(arc.v0, arc.v2).multiplyScalar(0.5);
      arc.v1.y += 0.16 + span * 0.16;
      tr.inU = 0.06;
    } else {
      tr.edge = found >= 0 ? found : -(found + 2);
      tr.reverse = found < 0;
      tr.inU = (R + 0.03) / edgeLen[tr.edge];
      edgeMats[tr.edge].uniforms.uColor.value.copy(nodes[to].accent);
      edgeMats[tr.edge].uniforms.uDir.value = tr.reverse ? -1 : 1;
    }
    for (const s of beadGlows) s.material.color.copy(nodes[to].accent);
    beadCoreMat.color.copy(nodes[to].accent).lerp(WHITE, 0.6);
  }

  function arrive() {
    tr.active = false;
    const to = tr.to;
    if (tr.edge >= 0) {
      edgeMats[tr.edge].uniforms.uHead.value = -1;
      eLitT[tr.edge] = EDGE_TRAIL;
    }
    st.landed = to;
    litT[to] = 1;
    rippleT[to] = 0;
  }

  function select(idx: number) {
    if (idx === st.current) return;
    if (tr.active) arrive(); // a new turn interrupts the packet in flight: settle it first
    if (idx < 0) {
      calm();
      return;
    }
    if (idx === GREETING) {
      // a new conversation: the trail fades, only greeting is lit
      litT.fill(0);
      eLitT.fill(0);
      litT[GREETING] = 1;
      st.current = GREETING;
      st.landed = GREETING;
      rippleT[GREETING] = 0;
      return;
    }
    const from = st.current < 0 ? GREETING : st.current;
    litT[from] = VISITED;
    st.landed = -1;
    st.current = idx;
    startTravel(from, idx);
  }

  /** Still: the canonical trail for the selected state, fully settled. */
  function applyStillPose() {
    const trail = STILL_TRAILS[st.selected ?? STILL_DEFAULT] ?? STILL_TRAILS[STILL_DEFAULT];
    tr.active = false;
    litT.fill(0);
    eLitT.fill(0);
    rippleT.fill(-1);
    press.fill(0);
    for (let k = 0; k < trail.length; k++) {
      const i = IDX[trail[k]];
      litT[i] = k === trail.length - 1 ? 1 : VISITED;
      if (k > 0) {
        const e = findEdge(IDX[trail[k - 1]], i);
        if (e !== -1) {
          const ei = e >= 0 ? e : -(e + 2);
          eLitT[ei] = EDGE_TRAIL;
          edgeMats[ei].uniforms.uColor.value.copy(nodes[i].accent);
        }
      }
    }
    st.current = IDX[trail[trail.length - 1]];
    st.landed = st.current;
    tr.alpha = 0;
  }

  /* --- camera fit -------------------------------------------------- */
  // Fit the plinth plus the label band above the pucks, then centre it with a view offset.
  const BOX = { x: PW / 2 + 0.04, y0: -0.1, y1: 0.62, z: PD / 2 + 0.05 };
  const corners: Vector3[] = [];
  for (const x of [-BOX.x, BOX.x]) for (const y of [BOX.y0, BOX.y1]) for (const z of [-BOX.z, BOX.z]) corners.push(new Vector3(x, y, z));
  const camDir = new Vector3(0.2, 0.64, 1).normalize();
  const target = new Vector3(0, 0.05, 0.02);
  const tv = new Vector3();
  const size = { w: 1, h: 1 };
  function extents() {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const c of corners) {
      tv.copy(c).project(camera);
      x0 = Math.min(x0, tv.x);
      x1 = Math.max(x1, tv.x);
      y0 = Math.min(y0, tv.y);
      y1 = Math.max(y1, tv.y);
    }
    return { x0, x1, y0, y1 };
  }
  function fitCamera(w: number, h: number) {
    size.w = w;
    size.h = h;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const MX = 0.92;
    const MY = 0.88;
    let lo = 1;
    let hi = 40;
    for (let k = 0; k < 24; k++) {
      const d = (lo + hi) / 2;
      camera.position.copy(target).addScaledVector(camDir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      const ex = extents();
      if ((ex.x1 - ex.x0) / 2 > MX || (ex.y1 - ex.y0) / 2 > MY) lo = d;
      else hi = d;
    }
    camera.position.copy(target).addScaledVector(camDir, hi);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const ex = extents();
    camera.setViewOffset(w, h, ((ex.x0 + ex.x1) / 2) * (w / 2), -((ex.y0 + ex.y1) / 2) * (h / 2), w, h);
  }

  let stillDrawn = false;
  const stopResize = autoResize(renderer, container, camera, (w, h) => {
    fitCamera(w, h);
    if (still && stillDrawn) queueMicrotask(renderStill);
  });

  /* --- interaction (live only) ------------------------------------ */
  const ray = new Raycaster();
  const ndc = new Vector2();
  const hits: Intersection[] = [];
  function pick(x: number, y: number) {
    ndc.set(x, y);
    ray.setFromCamera(ndc, camera);
    hits.length = 0;
    ray.intersectObjects(proxies, false, hits);
    return hits.length ? (hits[0].object.userData.index as number) : -1;
  }
  const drag = still
    ? null
    : dragRotate(canvas, {
        maxYaw: 0.6,
        maxPitch: 0.18,
        onTap: (x, y) => {
          const i = pick(x, y);
          if (i < 0) return;
          press[i] = 1;
          opts.onPick?.(NODES[i].id);
        },
      });
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    par.tx = x;
    par.ty = y;
    const i = drag?.state.dragging ? -1 : pick(x, y);
    if (i !== st.pickHover) {
      st.pickHover = i;
      canvas.style.cursor = i >= 0 ? 'pointer' : '';
    }
  };
  const onLeave = () => {
    par.tx = par.ty = 0;
    st.pickHover = -1;
    canvas.style.cursor = '';
  };
  if (!still) {
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
  }

  /* --- per-frame --------------------------------------------------- */
  let snap = false;
  let frameDt = 0;
  const damp = (cur: number, to: number, lambda: number) => (snap ? to : cur + (to - cur) * (1 - Math.exp(-lambda * frameDt)));

  function update(t: number, dt: number, snapNow = false) {
    snap = snapNow;
    frameDt = dt;

    // ambient sway (~2°) + drag + a whisper of pointer parallax
    const d = drag && !snapNow ? drag.update(dt) : null;
    par.x = damp(par.x, par.tx, 2.5);
    par.y = damp(par.y, par.ty, 2.5);
    turn.rotation.y = REST_YAW + (snapNow ? 0 : Math.sin(t * 0.21) * 0.035) + (d ? d.yaw : 0) + par.x * 0.03;
    turn.rotation.x = (snapNow ? 0 : Math.sin(t * 0.15 + 1) * 0.006) + (d ? d.pitch : 0) - par.y * 0.012;
    const grip = d ? d.grip : 0;
    body.position.y = grip * 0.03;
    shadow.material.opacity = 0.62 - grip * 0.12;

    // packet in flight
    if (tr.active) {
      tr.u = Math.min(1, tr.u + dt / TRAVEL);
      const e = inOut(tr.u);
      tr.alpha = smooth(tr.inU * 0.6, tr.inU + 0.07, e) * (1 - smooth(1 - tr.inU - 0.07, 1 - tr.inU * 0.6, e));
      for (let k = 0; k <= TRAIL; k++) {
        const ek = Math.max(0, e - k * 0.028);
        const s = beadGlows[k];
        if (tr.edge >= 0) edgeCurves[tr.edge].getPointAt(tr.reverse ? 1 - ek : ek, s.position);
        else arc.getPoint(ek, s.position);
        s.position.y += 0.012;
        s.material.opacity = tr.alpha * (k === 0 ? 0.85 : 0.4 * (1 - k / (TRAIL + 1)));
      }
      beadCore.position.copy(beadGlows[0].position);
      beadCoreMat.opacity = tr.alpha;
      if (tr.edge >= 0) edgeMats[tr.edge].uniforms.uHead.value = tr.reverse ? 1 - e : e;
      lightTarget.copy(beadGlows[0].position);
      lightTarget.y += 0.1;
      lightCol.copy(nodes[tr.to].accent);
      if (tr.u >= 1) arrive();
    } else {
      tr.alpha = damp(tr.alpha, 0, 10);
      for (let k = 0; k <= TRAIL; k++) beadGlows[k].material.opacity = tr.alpha * (k === 0 ? 0.85 : 0);
      beadCoreMat.opacity = tr.alpha;
      const rest = st.current >= 0 ? st.current : GREETING;
      pos(rest, FOOT + NODES[rest].h + 0.1, lightTarget);
      lightCol.copy(nodes[rest].accent);
    }
    beadCore.visible = beadCoreMat.opacity > 0.01;

    // light pool riding with the packet, then resting over the current state
    lightPos.x = damp(lightPos.x, lightTarget.x, tr.active ? 30 : 6);
    lightPos.y = damp(lightPos.y, lightTarget.y, tr.active ? 30 : 6);
    lightPos.z = damp(lightPos.z, lightTarget.z, tr.active ? 30 : 6);
    travelLight.position.copy(lightPos);
    lightLevel = damp(lightLevel, tr.active ? 1 : st.current >= 0 ? 0.75 : 0.35, 5);
    travelLight.color.lerp(lightCol, snap ? 1 : 1 - Math.exp(-8 * dt));
    travelLight.intensity = lightLevel * 0.42;

    // nodes
    const fadeL = st.current === GREETING || st.current < 0 ? 8 : 6;
    for (let i = 0; i < N; i++) {
      const n = nodes[i];
      lit[i] = damp(lit[i], litT[i], fadeL);
      hov[i] = damp(hov[i], i === st.hostHover || i === st.pickHover ? 1 : 0, 9);
      land[i] = damp(land[i], i === st.landed ? 1 : 0, 7);
      press[i] = snap ? 0 : press[i] * Math.exp(-7 * dt);
      const h = n.spec.h;
      n.lift.position.y = FOOT + h * (land[i] * LIFT + hov[i] * HOVER_LIFT) - press[i] * h * 0.05;
      n.lift.scale.y = 1 - press[i] * 0.05;
      const level = 0.17 + lit[i] * 0.98 + hov[i] * 0.28 + press[i] * 0.3;
      n.inlay.color.copy(n.accent).multiplyScalar(level);
      n.glow.material.opacity = Math.max(0, lit[i] - 0.3) * 0.3 + hov[i] * 0.05;
      n.seam.opacity = Math.min(1, land[i] * 0.55 + hov[i] * 0.35);
      n.seam.visible = n.seam.opacity > 0.01;
      // one ring rippling out from the base on arrival
      if (rippleT[i] >= 0 && !snap) {
        rippleT[i] += dt;
        const k = rippleT[i] / 1.15;
        if (k >= 1) {
          rippleT[i] = -1;
          n.ripple.visible = false;
        } else {
          const s = 1 - Math.pow(1 - k, 3);
          n.ripple.visible = true;
          n.ripple.scale.setScalar(1 + s * 1.5);
          n.ripple.material.opacity = (1 - s) * 0.55 * Math.min(1, k * 12);
        }
      } else if (snap) {
        rippleT[i] = -1;
        n.ripple.visible = false;
      }
    }

    // rails
    for (let e = 0; e < E; e++) {
      eLit[e] = damp(eLit[e], eLitT[e], fadeL);
      const u = edgeMats[e].uniforms;
      u.uLit.value = eLit[e];
      u.uTime.value = t;
    }
  }

  /* --- hotspots ---------------------------------------------------- */
  const hs: HotspotMap = {};
  for (const id of hotspotIds) hs[id] = { x: 0, y: 0 };
  function projectLabels() {
    const lift = LABEL_PX / Math.max(1, size.h);
    for (let i = 0; i < N; i++) {
      const n = nodes[i];
      tv.set(0, n.spec.h, 0);
      n.lift.localToWorld(tv);
      tv.project(camera);
      const p = hs[n.spec.id];
      p.x = (tv.x * 0.5 + 0.5) * 100;
      p.y = (-tv.y * 0.5 + 0.5 - lift) * 100;
    }
  }

  function draw() {
    renderer.render(scene, camera);
    projectLabels();
    opts.onHotspots?.(hs);
  }

  let readySent = false;
  const markReady = () => {
    if (readySent) return;
    readySent = true;
    opts.onReady?.();
  };

  function renderStill() {
    if (still) applyStillPose();
    else if (tr.active) arrive();
    update(0, 1 / 60, true);
    draw();
    stillDrawn = true;
    markReady();
  }

  // settle the calm pose so the first live frame starts composed
  update(0, 1 / 60, true);

  const loop = createLoop(
    renderer,
    (t, dt) => {
      update(t, dt);
      draw();
      markReady();
    },
    opts.onSlow,
  );

  return {
    start: () => {
      if (!still) loop.start();
    },
    stop: () => loop.stop(),
    renderStill,
    setSelected: (id) => {
      st.selected = id;
      if (still) return; // the still pose is built in renderStill
      select(indexOf(id));
    },
    setHovered: (id) => {
      st.hostHover = indexOf(id);
    },
    dispose() {
      loop.stop();
      stopResize();
      drag?.dispose();
      if (!still) {
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerleave', onLeave);
        canvas.style.cursor = '';
      }
      disposeObject(scene);
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}

const WHITE = new Color(0xffffff);
