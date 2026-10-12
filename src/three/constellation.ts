/**
 * Service Constellation — CMDB project sculpture.
 *
 * A miniature isometric service map on a thin dark-ceramic plate: a crowned
 * business-service tower, an application block, two rack-like servers and a
 * stacked database. Fine light channels inlaid in the plate carry the
 * synthetic topology (service → app → server A/B → database); every line
 * breathes faintly and a packet cascades through it the way an impact trace
 * walks a service map. Selecting a component lifts it, lights its inlay,
 * turns its direct relationships mint, keeps the rest of its dependency path
 * at the calm level and dims only what is off that path.
 *
 * Follows the SceneModule contract (see _template.ts): build → autoResize →
 * loop → hotspots every drawn frame → onReady → still pose → selection → dispose.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Shape,
  Vector2,
  Vector3,
  Vector4,
  type Intersection,
  type Material,
  type Sprite,
  type SpriteMaterial,
  type WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  addLightRig,
  applyStudioEnvironment,
  autoResize,
  contactShadow,
  createLoop,
  createRenderer,
  disposeObject,
  dragRotate,
  ease,
  flowMaterial,
  glowSprite,
  materials,
  PALETTE,
  pointerTracker,
  projectHotspots,
} from './kit';
import type { SceneHandle, SceneOptions } from './types';

export const hotspotIds = ['service', 'app', 'server-a', 'server-b', 'database'] as const;
type NodeId = (typeof hotspotIds)[number];

/* ------------------------------------------------------------------ */
/* Synthetic topology                                                  */
/* ------------------------------------------------------------------ */

/** Plate-space (x, z) positions. The camera looks from +x/+z, so +x reads down-right, +z down-left. */
const LAYOUT: Record<NodeId, readonly [number, number]> = {
  service: [-0.95, 0.95],
  app: [-0.34, 0.34],
  'server-a': [-0.34, -1.04],
  'server-b': [1.04, 0.34],
  database: [1.04, -1.04],
};

interface EdgeDef {
  from: NodeId;
  to: NodeId;
  /** Cascade level (0 = service link). */
  level: number;
  /** Orthogonal route in plate space, centre to centre. */
  route: readonly (readonly [number, number])[];
  /** Corner softening of the route. */
  radius: number;
}

const EDGES: readonly EdgeDef[] = [
  // the service link swings out in front of the app in one confident arc
  { from: 'service', to: 'app', level: 0, route: [LAYOUT.service, [-0.34, 0.95], LAYOUT.app], radius: 0.45 },
  { from: 'app', to: 'server-a', level: 1, route: [LAYOUT.app, LAYOUT['server-a']], radius: 0 },
  { from: 'app', to: 'server-b', level: 1, route: [LAYOUT.app, LAYOUT['server-b']], radius: 0 },
  { from: 'server-a', to: 'database', level: 2, route: [LAYOUT['server-a'], LAYOUT.database], radius: 0 },
  { from: 'server-b', to: 'database', level: 2, route: [LAYOUT['server-b'], LAYOUT.database], radius: 0 },
];

/**
 * How each component relates to every other one and to every edge, for a
 * given focus: its own direct relationships, the rest of its dependency path
 * (everything upstream that depends on it and everything downstream it
 * depends on) and what is off that path.
 */
const REL_OFF = 0;
const REL_PATH = 1;
const REL_DIRECT = 2;
const REL_SELF = 3;
function relations() {
  const ids = Object.keys(LAYOUT) as NodeId[];
  const walk = (start: NodeId, dir: 'up' | 'down') => {
    const seen = new Set<NodeId>([start]);
    const stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of EDGES) {
        const next = dir === 'down' ? (e.from === id ? e.to : null) : e.to === id ? e.from : null;
        if (next && !seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    return seen;
  };
  const node = {} as Record<NodeId, Record<NodeId, number>>;
  const edge = {} as Record<NodeId, number[]>;
  for (const f of ids) {
    const up = walk(f, 'up');
    const down = walk(f, 'down');
    node[f] = {} as Record<NodeId, number>;
    for (const n of ids) {
      const direct = EDGES.some((e) => (e.from === f && e.to === n) || (e.to === f && e.from === n));
      node[f][n] = n === f ? REL_SELF : direct ? REL_DIRECT : up.has(n) || down.has(n) ? REL_PATH : REL_OFF;
    }
    edge[f] = EDGES.map((e) =>
      e.from === f || e.to === f
        ? REL_DIRECT
        : (up.has(e.from) && up.has(e.to)) || (down.has(e.from) && down.has(e.to))
          ? REL_PATH
          : REL_OFF,
    );
  }
  return { node, edge };
}
const REL = relations();

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

const PLATE_HALF = 1.47;
const PLATE_RADIUS = 0.42;
const PLATE_DEPTH = 0.1;
/** Half-size of the fine groove that frames the plate top. */
const GROOVE = PLATE_HALF - 0.12;
const CAM_AZIMUTH = Math.PI / 4;
const CAM_ELEVATION = (33 * Math.PI) / 180;
/**
 * Breathing room around the sculpture (labels included): frame size / content
 * size. Narrow frames get more side room so the outer label pills (sized in
 * CSS pixels, not world units) never touch the canvas edge.
 */
const FRAME_MARGIN_X_WIDE = 1.08;
const FRAME_MARGIN_X_SQUARE = 1.2;
const FRAME_MARGIN_Y = 1.13;

const LIFT_SELECTED = 0.1;
/** Calm inlay level of every component except the business service. */
const INLAY_CALM = 0.45;
const LIFT_HOVERED = 0.035;
/**
 * Label anchors (component-local: x, y above the form's top, z). The back
 * row (service, server A, database) is labelled just above each form; the
 * application and server B stand in front of other forms, so their labels sit
 * on the open front of the plate, just ahead of each form's front corner, like
 * nameplates. That keeps every pill off the other forms at card and phone sizes.
 */
const LABEL_ABOVE = 0.34;
const LABELS: Record<NodeId, { x: number; y: number; z: number; onPlate: boolean }> = {
  service: { x: 0, y: LABEL_ABOVE, z: 0, onPlate: false },
  app: { x: 0.52, y: 0, z: 0.52, onPlate: true },
  'server-a': { x: 0, y: LABEL_ABOVE, z: 0, onPlate: false },
  'server-b': { x: 0.43, y: 0, z: 0.43, onPlate: true },
  database: { x: 0.12, y: LABEL_ABOVE, z: -0.12, onPlate: false },
};

const FLOW_SPEED = 0.55; // world units / second
/** One calm trace through the whole topology; it ends just before the next one starts. */
const CASCADE_PERIOD = 6.6; // seconds
/** Every line breathes on this period, phase-shifted downstream by level. */
const BREATH_PERIOD = 4.5;
const BREATH_LEVEL_PHASE = 0.35;
/** Continuous packets on focused relationships: speed factor and cycle (in edge lengths). */
const FOCUS_SPEED = 1.25;
const FOCUS_CYCLE = 1.5;
/**
 * The rest pose is the moment the calm trace has handed over to the servers:
 * both application → server packets this far along their lines. The live loop
 * starts from that same scene time and uses the same packet functions, so the
 * swap from the static image is seamless.
 */
const STILL_TRACE_AT = 0.6;
/* Direct manipulation (live only): turn the plate about its vertical centre, tilt a little. */
const MAX_YAW = 0.7;
const MAX_PITCH = 0.12;

/* ------------------------------------------------------------------ */
/* Local geometry helpers                                              */
/* ------------------------------------------------------------------ */

/** Polyline with softened corners (quadratic blends), as flat x,z pairs. */
function roundedRoute(pts: readonly (readonly [number, number])[], radius: number, closed = false, arcSegs = 10) {
  const out: number[] = [];
  const n = pts.length;
  const corner = (i: number) => {
    const p = pts[i];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const l0 = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const l1 = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const r = Math.min(radius, l0 / 2, l1 / 2);
    const sx = p[0] - ((p[0] - a[0]) / l0) * r;
    const sz = p[1] - ((p[1] - a[1]) / l0) * r;
    const ex = p[0] + ((b[0] - p[0]) / l1) * r;
    const ez = p[1] + ((b[1] - p[1]) / l1) * r;
    for (let k = 0; k <= arcSegs; k++) {
      const t = k / arcSegs;
      const u = 1 - t;
      out.push(u * u * sx + 2 * u * t * p[0] + t * t * ex, u * u * sz + 2 * u * t * p[1] + t * t * ez);
    }
  };
  if (closed) {
    for (let i = 0; i < n; i++) corner(i);
    out.push(out[0], out[1]);
  } else {
    out.push(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) corner(i);
    out.push(pts[n - 1][0], pts[n - 1][1]);
  }
  return out;
}

interface Strip {
  geometry: BufferGeometry;
  /** Flat x,z samples and their cumulative arc length. */
  xz: Float32Array;
  acc: Float32Array;
  length: number;
}

/**
 * Flat strip lying on the plate along a path. uv.x runs 0→1 along the length
 * (for kit.flowMaterial), uv.y 0→1 across the width.
 */
function flatStrip(xz: number[], width: number, y: number): Strip {
  const n = xz.length / 2;
  const acc = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    acc[i] = acc[i - 1] + Math.hypot(xz[i * 2] - xz[i * 2 - 2], xz[i * 2 + 1] - xz[i * 2 - 1]);
  }
  const length = acc[n - 1];
  const pos = new Float32Array(n * 6);
  const uv = new Float32Array(n * 4);
  const nrm = new Float32Array(n * 6);
  const half = width / 2;
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(n - 1, i + 1);
    let tx = xz[i1 * 2] - xz[i0 * 2];
    let tz = xz[i1 * 2 + 1] - xz[i0 * 2 + 1];
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const nx = -tz * half;
    const nz = tx * half;
    const x = xz[i * 2];
    const z = xz[i * 2 + 1];
    pos.set([x + nx, y, z + nz, x - nx, y, z - nz], i * 6);
    nrm.set([0, 1, 0, 0, 1, 0], i * 6);
    const u = length > 0 ? acc[i] / length : 0;
    uv.set([u, 1, u, 0], i * 4);
  }
  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new BufferAttribute(nrm, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  const flat = new Float32Array(xz);
  return { geometry, xz: flat, acc, length };
}

/** Point at fraction `t` (0–1) along a strip's centre line, written into `out` (x, z only). */
function stripPoint(s: Strip, t: number, out: Vector3) {
  const target = Math.max(0, Math.min(1, t)) * s.length;
  const n = s.acc.length;
  let i = 1;
  while (i < n - 1 && s.acc[i] < target) i++;
  const a = s.acc[i - 1];
  const seg = s.acc[i] - a || 1;
  const k = (target - a) / seg;
  out.x = s.xz[i * 2 - 2] + (s.xz[i * 2] - s.xz[i * 2 - 2]) * k;
  out.z = s.xz[i * 2 - 1] + (s.xz[i * 2 + 1] - s.xz[i * 2 - 1]) * k;
  return out;
}

/** Rounded-rectangle plate, top face at y = 0. */
function plateGeometry(half: number, radius: number, depth: number, bevel: number) {
  const s = new Shape();
  const h = half - bevel;
  const r = radius - bevel;
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  const g = new ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 24,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -(depth + bevel), 0);
  return g;
}

/** Disc with softly rounded rims (lathe), base at y = 0. */
function roundedDisc(radius: number, height: number, bevel: number, radial = 64) {
  const pts: Vector2[] = [new Vector2(0, 0)];
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 5; k++) {
      const a = a0 + ((a1 - a0) * k) / 5;
      pts.push(new Vector2(cx + Math.cos(a) * bevel, cy + Math.sin(a) * bevel));
    }
  };
  arc(radius - bevel, bevel, -Math.PI / 2, 0);
  arc(radius - bevel, height - bevel, 0, Math.PI / 2);
  pts.push(new Vector2(0, height));
  return new LatheGeometry(pts, radial);
}

/**
 * Full-screen quad that only draws into three's transmission buffer. On an
 * alpha canvas that buffer is otherwise cleared to 50% white, which turns the
 * rim of the glass crown milky; this keeps it smoky instead.
 */
function transmissionBackdrop(tint: Vector4) {
  const mat = new ShaderMaterial({
    uniforms: { uTint: { value: tint } },
    vertexShader: /* glsl */ `void main() { gl_Position = vec4(position.xy * 2.0, 1.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec4 uTint; void main() { gl_FragColor = uTint; }`,
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

/**
 * Collapse a component's meshes into one mesh per material (fewer draw calls
 * in the main, shadow and transmission passes). Source geometries are
 * disposed; shadow flags are kept per material group.
 */
function mergeByMaterial(group: Group) {
  const buckets = new Map<string, Mesh[]>();
  for (const child of group.children) {
    const mesh = child as Mesh;
    if (!mesh.isMesh) continue;
    const mat = mesh.material as Material;
    const key = `${mat.uuid}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}`;
    const list = buckets.get(key);
    if (list) list.push(mesh);
    else buckets.set(key, [mesh]);
  }
  const used = new Set<BufferGeometry>();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const parts = list.map((m) => {
      m.updateMatrix();
      used.add(m.geometry);
      const g = m.geometry.clone().applyMatrix4(m.matrix);
      return g;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) continue;
    const out = new Mesh(merged, list[0].material);
    out.castShadow = list[0].castShadow;
    out.receiveShadow = list[0].receiveShadow;
    for (const m of list) group.remove(m);
    group.add(out);
  }
  // dispose geometries no longer referenced by any child
  const live = new Set<BufferGeometry>();
  group.traverse((o) => {
    if ((o as Mesh).isMesh) live.add((o as Mesh).geometry);
  });
  used.forEach((g) => {
    if (!live.has(g)) g.dispose();
  });
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

interface NodeRig {
  id: NodeId;
  /** Lifts on selection. */
  body: Group;
  anchor: Object3D;
  inlay: MeshBasicMaterial;
  inlayBase: number;
  /** Brightness compensation for an inlay seen through glass. */
  gain: number;
  outline: MeshBasicMaterial;
  outlineMesh: Mesh;
  shadow: MeshBasicMaterial;
  shadowBase: number;
  /** Footprint corners/top for framing. */
  half: number;
  top: number;
  lift: number;
  glow: number;
  ring: number;
}

interface EdgeRig {
  def: EdgeDef;
  strip: Strip;
  base: MeshBasicMaterial;
  calm: ShaderMaterial;
  focus: ShaderMaterial;
  calmMesh: Mesh;
  focusMesh: Mesh;
  calmSpark: Sprite;
  focusSpark: Sprite;
  emphasis: number;
  calmLevel: number;
  focusLevel: number;
  start: number;
  duration: number;
}

export function create(opts: SceneOptions): SceneHandle {
  const { canvas, container, still = false } = opts;
  const renderer = createRenderer(canvas, opts.maxDpr ?? 1.75, still);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // Full-resolution transmission in both modes: the crown's fine inlay frame
  // blurs and dims in a smaller buffer, and the live frame must match the still.
  renderer.transmissionResolutionScale = 1;

  const scene = new Scene();
  applyStudioEnvironment(renderer, scene, 0.7);
  const lights = addLightRig(scene);
  lights.key.castShadow = true;
  lights.key.shadow.mapSize.set(1024, 1024);
  lights.key.shadow.radius = 5;
  lights.key.shadow.bias = -0.0004;
  lights.key.shadow.normalBias = 0.015;
  lights.key.shadow.intensity = 0.75;
  const sc = lights.key.shadow.camera;
  sc.left = -2.8;
  sc.right = 2.8;
  sc.top = 2.8;
  sc.bottom = -2.8;
  sc.near = 2;
  sc.far = 16;
  sc.updateProjectionMatrix();
  scene.add(transmissionBackdrop(new Vector4(0.012, 0.016, 0.022, 0.3)));

  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 80);

  // outer: tilts about the camera's right axis; inner: ambient yaw sway.
  const outer = new Group();
  outer.rotation.order = 'YXZ';
  outer.rotation.y = CAM_AZIMUTH;
  const root = new Group();
  root.rotation.y = -CAM_AZIMUTH;
  outer.add(root);
  scene.add(outer);

  /* ---------------- Materials ---------------- */
  const ceramic = materials.darkCeramic();
  const ceramicDeep = materials.darkCeramic({ color: 0x11151b, roughness: 0.42 });
  // The plate stays a shade below the forms' lit tops so the forms lead.
  const plateMat = materials.darkCeramic({ color: 0x1b2129, roughness: 0.7, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.5 });
  const metal = materials.satinMetal({ color: 0x9aa2ad, roughness: 0.38 });
  const metalDark = materials.satinMetal({ color: 0x5d6570, roughness: 0.42 });
  const bezel = materials.satinMetal({ color: 0x5d6570, roughness: 0.5 });
  const panel = materials.satinMetal({ color: 0x353c46, roughness: 0.5 });
  // Near-index-matched smoked glass: the lit frame inside reads as one crisp
  // shape from every side instead of a refracted double.
  const glass = materials.smokedGlass({
    thickness: 0.2,
    ior: 1.0,
    attenuationDistance: 0.65,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.1,
  });
  // Where the crown is seen against the empty canvas its alpha comes from the
  // backdrop tint; keep alpha >= colour so highlights survive the still export.
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <colorspace_fragment>',
      '#include <colorspace_fragment>\n\tgl_FragColor.a = max(gl_FragColor.a, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));',
    );
  };
  glass.customProgramCacheKey = () => 'constellation-crown-glass';

  const mintLinear = new Color(PALETTE.mint);
  const iceLinear = new Color(PALETTE.ice);

  /* ---------------- Plate ---------------- */
  const plate = new Mesh(plateGeometry(PLATE_HALF, PLATE_RADIUS, PLATE_DEPTH, 0.022), plateMat);
  plate.receiveShadow = true;
  root.add(plate);
  const foot = new Mesh(plateGeometry(PLATE_HALF - 0.07, PLATE_RADIUS - 0.07, 0.035, 0.008), metalDark);
  foot.position.y = -PLATE_DEPTH - 0.044;
  root.add(foot);
  const groove = flatStrip(
    roundedRoute(
      [
        [-GROOVE, -GROOVE],
        [GROOVE, -GROOVE],
        [GROOVE, GROOVE],
        [-GROOVE, GROOVE],
      ],
      PLATE_RADIUS - (PLATE_HALF - GROOVE),
      true,
      12,
    ),
    0.014,
    0.002,
  );
  const grooveMesh = new Mesh(
    groove.geometry,
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false, side: DoubleSide }),
  );
  grooveMesh.renderOrder = -1;
  root.add(grooveMesh);
  const groundShadow = contactShadow(PLATE_HALF * 3.1, PLATE_HALF * 3.1, 0.5);
  groundShadow.position.y = -PLATE_DEPTH - 0.1;
  groundShadow.renderOrder = -2;
  root.add(groundShadow);

  /* ---------------- Components ---------------- */
  const add = (parent: Object3D, mesh: Mesh, x: number, y: number, z: number, cast = true) => {
    mesh.position.set(x, y, z);
    if (cast) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    parent.add(mesh);
    return mesh;
  };
  const inlayMat = () => new MeshBasicMaterial({ color: mintLinear.clone(), toneMapped: false });

  function makeNode(id: NodeId, half: number, round: boolean, build: (body: Group, inlay: MeshBasicMaterial) => number): NodeRig {
    const [x, z] = LAYOUT[id];
    const holder = new Group();
    holder.position.set(x, 0, z);
    root.add(holder);
    const body = new Group();
    holder.add(body);
    const inlay = inlayMat();
    const top = build(body, inlay);
    mergeByMaterial(body);
    // labels above a form ride with it when it lifts; nameplates stay on the plate
    const lab = LABELS[id];
    const anchor = new Object3D();
    anchor.position.set(lab.x, lab.onPlate ? 0.004 : top + lab.y, lab.z);
    (lab.onPlate ? holder : body).add(anchor);

    // soft contact shadow + selection outline stay on the plate
    const cs = contactShadow(half * 3.6, half * 3.6, 0.8);
    cs.position.y = 0.002;
    cs.renderOrder = -1;
    holder.add(cs);
    const shadow = cs.material as MeshBasicMaterial;

    const r = half + 0.06;
    const ring = round
      ? flatStrip(
          Array.from({ length: 97 }, (_, i) => {
            const a = (i / 96) * Math.PI * 2;
            return [Math.cos(a) * r, Math.sin(a) * r];
          }).flat(),
          0.018,
          0.004,
        )
      : flatStrip(roundedRoute([[-r, -r], [r, -r], [r, r], [-r, r]], 0.11, true, 8), 0.018, 0.004);
    const outline = new MeshBasicMaterial({
      color: mintLinear.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      side: DoubleSide,
    });
    const ringMesh = new Mesh(ring.geometry, outline);
    ringMesh.renderOrder = 2;
    holder.add(ringMesh);

    return {
      id,
      body,
      anchor,
      inlay,
      inlayBase: INLAY_CALM,
      gain: 1,
      outline,
      outlineMesh: ringMesh,
      shadow,
      shadowBase: 0.8,
      half,
      top,
      lift: 0,
      glow: INLAY_CALM,
      ring: 0,
    };
  }

  // Business service: plinth, tall shaft with fine satin reveals, a thin satin
  // bezel and a smoked-glass crown over a lit mint frame.
  const service = makeNode('service', 0.33, false, (b, inlay) => {
    add(b, new Mesh(new RoundedBoxGeometry(0.66, 0.1, 0.66, 3, 0.03), ceramicDeep), 0, 0.05, 0);
    add(b, new Mesh(new RoundedBoxGeometry(0.52, 1.08, 0.52, 4, 0.045), ceramic), 0, 0.1 + 0.54, 0);
    // one hairline reveal inset from each visible vertical edge
    const revealX = new RoundedBoxGeometry(0.006, 0.9, 0.008, 1, 0.002);
    const revealZ = new RoundedBoxGeometry(0.008, 0.9, 0.006, 1, 0.002);
    for (const s of [-1, 1]) {
      add(b, new Mesh(revealX, metalDark), 0.26, 0.64, s * 0.2, false);
      add(b, new Mesh(revealZ, metalDark), s * 0.2, 0.64, 0.26, false);
    }
    add(b, new Mesh(new RoundedBoxGeometry(0.55, 0.022, 0.55, 2, 0.008), bezel), 0, 1.18 + 0.011, 0);
    // dark seat under the glass so the crown reads as one smoked volume
    add(b, new Mesh(new RoundedBoxGeometry(0.5, 0.006, 0.5, 1, 0.002), ceramicDeep), 0, 1.202 + 0.002, 0, false);
    // lit frame floating inside the glass
    const frame = flatStrip(roundedRoute([[-0.17, -0.17], [0.17, -0.17], [0.17, 0.17], [-0.17, 0.17]], 0.06, true, 8), 0.022, 0);
    add(b, new Mesh(frame.geometry, inlay), 0, 1.202 + 0.12, 0, false);
    const crown = add(b, new Mesh(new RoundedBoxGeometry(0.54, 0.26, 0.54, 4, 0.05), glass), 0, 1.202 + 0.13, 0, false);
    crown.castShadow = true;
    return 1.462;
  });
  // the business service carries the brightest calm accent; its frame is seen
  // through smoked glass, so it is driven harder to read at the same level
  service.inlayBase = service.glow = 0.9;
  service.gain = 1.8;
  service.inlay.side = DoubleSide;

  // Application: two-tier block with a lit seam where the tiers meet and a
  // hairline satin window frame on each face of the lower tier.
  const app = makeNode('app', 0.32, false, (b, inlay) => {
    add(b, new Mesh(new RoundedBoxGeometry(0.64, 0.6, 0.64, 4, 0.05), ceramic), 0, 0.3, 0);
    {
      const W = 0.38;
      const H = 0.24;
      const L = 0.007;
      const hz = new RoundedBoxGeometry(L, L, W, 1, 0.002);
      const vt = new RoundedBoxGeometry(L, H, L, 1, 0.002);
      const y0 = 0.3;
      for (const side of [-1, 1]) {
        for (const axis of [0, 1]) {
          const at = (u: number, y: number, g: RoundedBoxGeometry) => {
            const m = new Mesh(g, metalDark);
            if (axis === 1) m.rotation.y = Math.PI / 2;
            add(b, m, axis === 0 ? side * 0.32 : u, y, axis === 0 ? u : side * 0.32, false);
          };
          at(0, y0 + H / 2, hz);
          at(0, y0 - H / 2, hz);
          at(-W / 2, y0, vt);
          at(W / 2, y0, vt);
        }
      }
    }
    add(b, new Mesh(new RoundedBoxGeometry(0.49, 0.016, 0.49, 1, 0.005), inlay), 0, 0.608, 0, false);
    add(b, new Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.5, 4, 0.045), ceramic), 0, 0.62 + 0.15, 0);
    add(b, new Mesh(new RoundedBoxGeometry(0.3, 0.012, 0.3, 1, 0.004), panel), 0, 0.92 + 0.004, 0, false);
    return 0.93;
  });

  // Servers: stacked slabs on satin spacers, a status slit per slab.
  const rack = (slabs: number) => (b: Group, inlay: MeshBasicMaterial) => {
    const slabH = 0.12;
    const gap = 0.032;
    add(b, new Mesh(new RoundedBoxGeometry(0.5, 0.03, 0.5, 1, 0.01), metalDark), 0, 0.015, 0);
    let y = 0.03;
    const slabGeo = new RoundedBoxGeometry(0.58, slabH, 0.58, 3, 0.025);
    const spacerGeo = new RoundedBoxGeometry(0.5, gap, 0.5, 1, 0.008);
    const slitGeo = new RoundedBoxGeometry(0.15, 0.016, 0.01, 1, 0.004);
    for (let i = 0; i < slabs; i++) {
      add(b, new Mesh(slabGeo, ceramic), 0, y + slabH / 2, 0);
      add(b, new Mesh(slitGeo, inlay), 0.13, y + slabH / 2, 0.29 + 0.002, false);
      y += slabH;
      if (i < slabs - 1) {
        add(b, new Mesh(spacerGeo, metal), 0, y + gap / 2, 0);
        y += gap;
      }
    }
    return y;
  };
  const serverA = makeNode('server-a', 0.29, false, rack(5));
  const serverB = makeNode('server-b', 0.29, false, rack(4));

  // Database: three rounded discs on satin spacers, ring inlay on top.
  const database = makeNode('database', 0.31, true, (b, inlay) => {
    add(b, new Mesh(new CylinderGeometry(0.27, 0.27, 0.03, 48), metalDark), 0, 0.015, 0);
    const discGeo = roundedDisc(0.31, 0.14, 0.03);
    const spacerGeo = new CylinderGeometry(0.28, 0.28, 0.035, 48);
    let y = 0.03;
    for (let i = 0; i < 3; i++) {
      add(b, new Mesh(discGeo, ceramic), 0, y, 0);
      y += 0.14;
      if (i < 2) {
        add(b, new Mesh(spacerGeo, metal), 0, y + 0.0175, 0);
        y += 0.035;
      }
    }
    const ring = new Mesh(new RingGeometry(0.17, 0.19, 64), inlay);
    ring.rotation.x = -Math.PI / 2;
    add(b, ring, 0, y + 0.002, 0, false);
    return y;
  });

  const nodes: Record<NodeId, NodeRig> = {
    service,
    app,
    'server-a': serverA,
    'server-b': serverB,
    database,
  };
  const nodeList = hotspotIds.map((id) => nodes[id]);

  /* ---------------- Connections ---------------- */
  const edges: EdgeRig[] = [];
  {
    const levelStart = [0, 0, 0];
    for (const def of EDGES) {
      const xz = roundedRoute(def.route, def.radius, false, 16);
      const line = flatStrip(xz, 0.026, 0.003);
      const strip = flatStrip(xz, 0.075, 0.005);
      const base = new MeshBasicMaterial({
        color: iceLinear.clone(),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
      });
      const lineMesh = new Mesh(line.geometry, base);
      lineMesh.renderOrder = 1;
      root.add(lineMesh);
      const calm = flowMaterial({ length: 0.42 / strip.length, intensity: 1.6 });
      const focus = flowMaterial({ length: 0.36 / strip.length, intensity: 2.4 });
      const calmMesh = new Mesh(strip.geometry, calm);
      const focusMesh = new Mesh(strip.geometry, focus);
      calmMesh.renderOrder = 3;
      focusMesh.renderOrder = 3;
      root.add(calmMesh, focusMesh);
      const calmSpark = glowSprite(PALETTE.mint, 0.2, 0);
      const focusSpark = glowSprite(PALETTE.mint, 0.24, 0);
      calmSpark.renderOrder = 4;
      focusSpark.renderOrder = 4;
      root.add(calmSpark, focusSpark);
      const duration = strip.length / FLOW_SPEED;
      edges.push({
        def,
        strip,
        base,
        calm,
        focus,
        calmMesh,
        focusMesh,
        calmSpark,
        focusSpark,
        emphasis: 0.4,
        calmLevel: 1,
        focusLevel: 0,
        start: 0,
        duration,
      });
      levelStart[def.level] = Math.max(levelStart[def.level], duration);
    }
    // cascade: each level starts as the previous one reaches its target's base
    const starts = [0, levelStart[0] * 0.82, levelStart[0] * 0.82 + levelStart[1] * 0.82];
    for (const e of edges) e.start = starts[e.def.level];
  }
  const level1 = edges.find((e) => e.def.level === 1)!;
  const stillTime = level1.start + STILL_TRACE_AT * level1.duration;

  /* ---------------- Framing ---------------- */
  const camDir = new Vector3(
    Math.sin(CAM_AZIMUTH) * Math.cos(CAM_ELEVATION),
    Math.sin(CAM_ELEVATION),
    Math.cos(CAM_AZIMUTH) * Math.cos(CAM_ELEVATION),
  );
  const camRight = new Vector3(0, 1, 0).cross(camDir).normalize();
  const camUp = camDir.clone().cross(camRight).normalize();
  const bounds = { minR: Infinity, maxR: -Infinity, minU: Infinity, maxU: -Infinity };
  {
    const p = new Vector3();
    const addPoint = (x: number, y: number, z: number, padU = 0) => {
      p.set(x, y, z);
      const r = p.dot(camRight);
      const u = p.dot(camUp);
      bounds.minR = Math.min(bounds.minR, r);
      bounds.maxR = Math.max(bounds.maxR, r);
      bounds.minU = Math.min(bounds.minU, u - padU);
      bounds.maxU = Math.max(bounds.maxU, u + padU);
    };
    const ph = PLATE_HALF;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, -PLATE_DEPTH - 0.08]) addPoint(sx * ph, y, sz * ph);
    for (const n of nodeList) {
      const [x, z] = LAYOUT[n.id];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) addPoint(x + sx * n.half, n.top + LIFT_SELECTED, z + sz * n.half);
      // room for the HTML label pill around each anchor
      const lab = LABELS[n.id];
      addPoint(x + lab.x, lab.onPlate ? 0 : n.top + LIFT_SELECTED + lab.y, z + lab.z, 0.14);
    }
  }
  const camTarget = new Vector3()
    .addScaledVector(camRight, (bounds.minR + bounds.maxR) / 2)
    .addScaledVector(camUp, (bounds.minU + bounds.maxU) / 2);

  const stopResize = autoResize(renderer, container, camera, (w, h) => {
    const aspect = w / h;
    const wide = Math.max(0, Math.min(1, (aspect - 1.2) / 0.3));
    const marginX = FRAME_MARGIN_X_SQUARE + (FRAME_MARGIN_X_WIDE - FRAME_MARGIN_X_SQUARE) * wide;
    const halfW = ((bounds.maxR - bounds.minR) / 2) * marginX;
    const halfH = ((bounds.maxU - bounds.minU) / 2) * FRAME_MARGIN_Y;
    const fitH = Math.max(halfH, halfW / aspect);
    camera.left = -fitH * aspect;
    camera.right = fitH * aspect;
    camera.top = fitH;
    camera.bottom = -fitH;
    camera.position.copy(camTarget).addScaledVector(camDir, 30);
    camera.lookAt(camTarget);
  });

  /* ---------------- State ---------------- */
  const pointer = pointerTracker(container, !still);
  const state = { selected: null as NodeId | null, hovered: null as NodeId | null };
  const isNode = (id: string | null): id is NodeId => id !== null && (hotspotIds as readonly string[]).includes(id);

  const sparkPos = new Vector3();
  const hotspotEntries: [string, Object3D][] = nodeList.map((n) => [n.id, n.anchor]);

  const wrap = (v: number, period: number) => ((v % period) + period) % period;

  /** Calm trace: one packet per level, handed down the topology once per period (-1 = none). */
  function cascadeHead(e: EdgeRig, t: number) {
    const h = (wrap(t, CASCADE_PERIOD) - e.start) / e.duration;
    return h >= 0 && h <= 1.35 ? h : -1;
  }

  /** Continuous packets on a focused relationship; `offset` in cycles (-1 = between packets). */
  function focusHead(e: EdgeRig, t: number, offset: number) {
    const h = wrap(((t - e.start) * FLOW_SPEED * FOCUS_SPEED) / e.strip.length + offset * FOCUS_CYCLE, FOCUS_CYCLE);
    return h <= 1.2 ? h : -1;
  }

  function placeSpark(spark: Sprite, e: EdgeRig, head: number, strength: number) {
    const mat = spark.material as SpriteMaterial;
    if (head < 0 || strength <= 0.001) {
      mat.opacity = 0;
      spark.visible = false;
      return;
    }
    stripPoint(e.strip, head, sparkPos);
    spark.position.set(sparkPos.x, 0.03, sparkPos.z);
    // fade in leaving the source, fade out arriving under the target
    const fadeIn = Math.min(1, head / 0.08);
    const fadeOut = Math.max(0, Math.min(1, (1.0 - head) / 0.1));
    mat.opacity = strength * fadeIn * fadeOut;
    spark.visible = mat.opacity > 0.002;
  }

  /** How far a packet head is from both ends of its edge (-1 = no packet). */
  const openness = (h: number) => (h < 0 ? -1 : Math.min(h, 1 - h));

  /** Approach factor for one frame (1 = settle immediately). */
  const approach = (lambda: number, dt: number, snap: boolean) => (snap ? 1 : 1 - Math.exp(-lambda * dt));

  /* ---------------- Direct manipulation (live only; still mode attaches nothing) ---------------- */
  // Drag to turn the map; click / tap a component to select it (the host
  // answers with setSelected, so this never self-selects).
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hits: Intersection[] = [];
  const pickables: Object3D[] = [];
  const pickNode = new Map<Object3D, NodeId>();
  for (const n of nodeList) {
    for (const child of n.body.children) {
      if (!(child as Mesh).isMesh) continue;
      pickables.push(child);
      pickNode.set(child, n.id);
    }
  }
  /** Component (if any) under a point in normalised device coordinates. */
  function pickAt(x: number, y: number): NodeId | null {
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, camera);
    hits.length = 0;
    raycaster.intersectObjects(pickables, false, hits);
    const id = hits.length ? (pickNode.get(hits[0].object) ?? null) : null;
    hits.length = 0;
    return id;
  }
  const drag = still
    ? null
    : dragRotate(canvas, {
        maxYaw: MAX_YAW,
        maxPitch: MAX_PITCH,
        onTap: (x, y) => {
          const id = pickAt(x, y);
          if (id) opts.onPick?.(id);
          console.debug('[pick]', id); // TEMP-PICK
        },
      });
  // Mouse hover over a component: its hovered look plus a pointer cursor.
  let pickHover: NodeId | null = null;
  let hoverDirty = false;
  let hoverIn = false;
  const hoverAt = new Vector2();
  const onHoverMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    hoverAt.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    hoverIn = true;
    hoverDirty = true;
  };
  const onHoverLeave = () => {
    hoverIn = false;
    hoverDirty = true;
  };
  if (!still) {
    canvas.addEventListener('pointermove', onHoverMove);
    canvas.addEventListener('pointerleave', onHoverLeave);
  }
  let wasDragging = false;
  /** Once per live frame: advance the drag spring and resolve hover (at most one raycast). */
  function stepPointer(dt: number) {
    if (!drag) return;
    drag.update(dt);
    const dragging = drag.state.dragging;
    if (dragging !== wasDragging) {
      wasDragging = dragging;
      hoverDirty = true;
    }
    if (!hoverDirty) return;
    hoverDirty = false;
    const id = hoverIn && !dragging ? pickAt(hoverAt.x, hoverAt.y) : null;
    if (id === pickHover) return;
    pickHover = id;
    canvas.style.cursor = id ? 'pointer' : '';
  }

  const swayRot = { y: 0, x: 0 };
  /**
   * Advance the pose. `rest` draws the deterministic still pose: no sway, no
   * pointer, every transition settled; packets use the same functions of time
   * as the live loop, so the still is exactly the live loop's first frame.
   */
  function update(t: number, dt: number, rest: boolean, snap = rest) {
    const sel = state.selected;
    const hov = rest ? state.hovered : (pickHover ?? state.hovered);
    const ds = drag && !rest ? drag.state : null;
    const grip = ds ? ds.grip : 0;

    // ambient sway + gentle pointer response (the parallax yields while the map is held)
    if (rest) {
      swayRot.y = 0;
      swayRot.x = 0;
    } else {
      const p = pointer.update(0.05);
      const follow = 1 - grip;
      const sway = Math.sin(t * 0.16) * 0.03 + Math.sin(t * 0.07 + 1.3) * 0.015;
      swayRot.y = ease.damp(swayRot.y, sway + p.x * 0.08 * follow, 3, dt);
      swayRot.x = ease.damp(swayRot.x, p.y * 0.035 * follow, 3, dt);
    }
    root.rotation.y = -CAM_AZIMUTH + swayRot.y + (ds ? ds.yaw : 0);
    outer.rotation.x = swayRot.x + (ds ? ds.pitch : 0);
    // held: the rim light lifts and every inlay wakes a little
    lights.rim.intensity = 1.1 + 0.4 * grip;
    const wake = 1 + 0.3 * grip;

    const kLift = approach(7, dt, snap);
    const kGlow = approach(6, dt, snap);
    const kRing = approach(8, dt, snap);
    for (const n of nodeList) {
      const isSel = sel === n.id;
      const isHov = hov === n.id;
      const liftT = isSel ? LIFT_SELECTED : isHov ? LIFT_HOVERED : 0;
      let glowT = n.inlayBase;
      if (sel) {
        const rel = REL.node[sel][n.id];
        glowT = rel === REL_SELF ? 1.35 : rel === REL_DIRECT ? 0.8 : rel === REL_PATH ? 0.5 : 0.16;
        if (isHov && !isSel) glowT = Math.max(glowT, 0.75);
      } else if (hov) {
        const rel = REL.node[hov][n.id];
        glowT = rel === REL_SELF ? Math.max(1, n.inlayBase + 0.25) : rel === REL_DIRECT ? 0.65 : rel === REL_PATH ? 0.5 : 0.3;
      }
      const ringT = isSel ? 0.9 : isHov ? 0.4 : 0;
      n.lift += (liftT - n.lift) * kLift;
      n.glow += (glowT - n.glow) * kGlow;
      n.ring += (ringT - n.ring) * kRing;
      n.body.position.y = n.lift;
      n.inlay.color.copy(mintLinear).multiplyScalar(n.glow * n.gain * wake);
      n.outline.opacity = n.ring;
      n.outlineMesh.visible = n.ring > 0.002;
      n.shadow.opacity = n.shadowBase * (1 - (n.lift / LIFT_SELECTED) * 0.45);
    }

    const kEmph = approach(6, dt, snap);
    const kLevel = approach(4, dt, snap);
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      // calm: quiet ice lines, all breathing, one trace cascading through
      let emphT = 0.42;
      let calmT = 1;
      let focusT = 0;
      if (sel) {
        // direct relationships turn mint and carry packets; the rest of the
        // dependency path holds the calm look with its trace; the rest dims
        const rel = REL.edge[sel][i];
        emphT = rel === REL_DIRECT ? 1 : rel === REL_PATH ? 0.42 : 0.12;
        calmT = rel === REL_PATH ? 0.85 : 0;
        focusT = rel === REL_DIRECT ? 1 : 0;
      } else if (hov) {
        const rel = REL.edge[hov][i];
        emphT = rel === REL_DIRECT ? 0.75 : rel === REL_PATH ? 0.42 : 0.26;
        calmT = rel === REL_DIRECT ? 0.35 : rel === REL_PATH ? 0.9 : 0.4;
        focusT = rel === REL_DIRECT ? 0.6 : 0;
      }
      e.emphasis += (emphT - e.emphasis) * kEmph;
      e.calmLevel += (calmT - e.calmLevel) * kLevel;
      e.focusLevel += (focusT - e.focusLevel) * kLevel;

      // fine base line: quiet ice at rest, mint when it carries a focused relationship
      e.base.color.copy(iceLinear).lerp(mintLinear, Math.max(0, (e.emphasis - 0.42) / 0.58));
      const opacity = e.emphasis <= 0.42 ? 0.06 + e.emphasis : 0.48 + (e.emphasis - 0.42) * 0.36;
      const breath = Math.sin((t / BREATH_PERIOD - BREATH_LEVEL_PHASE * e.def.level) * Math.PI * 2);
      e.base.opacity = opacity * (1 + 0.11 * breath * (1 - e.focusLevel));

      // calm trace
      const ch = cascadeHead(e, t);
      e.calm.uniforms.uHead.value = ch;
      e.calm.uniforms.uFade.value = 0.62 * e.calmLevel;
      e.calmMesh.visible = ch >= 0 && e.calmLevel > 0.002;
      placeSpark(e.calmSpark, e, ch, 0.36 * e.calmLevel);

      // focused relationship: two continuous, slightly quicker packets
      const fh = focusHead(e, t, 0);
      const fh2 = focusHead(e, t, 0.5);
      e.focus.uniforms.uHead.value = fh;
      e.focus.uniforms.uHead2.value = fh2;
      e.focus.uniforms.uFade.value = e.focusLevel;
      e.focusMesh.visible = e.focusLevel > 0.002;
      // the spark rides whichever packet is out in the open
      placeSpark(e.focusSpark, e, openness(fh) >= openness(fh2) ? fh : fh2, 0.6 * e.focusLevel);
    }
  }

  function draw() {
    renderer.render(scene, camera);
    opts.onHotspots?.(projectHotspots(camera, hotspotEntries));
  }

  let readySent = false;
  const ready = () => {
    if (!readySent) {
      readySent = true;
      opts.onReady?.();
    }
  };
  let first = true;
  const loop = createLoop(
    renderer,
    (t, dt) => {
      stepPointer(dt);
      update(t + stillTime, dt, false, first);
      first = false;
      draw();
      ready();
    },
    opts.onSlow,
  );

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    renderStill() {
      update(stillTime, 1, true);
      draw();
      ready();
    },
    setSelected(id) {
      state.selected = isNode(id) ? id : null;
    },
    setHovered(id) {
      state.hovered = isNode(id) ? id : null;
    },
    dispose() {
      loop.stop();
      stopResize();
      pointer.dispose();
      if (drag) {
        drag.dispose();
        canvas.removeEventListener('pointermove', onHoverMove);
        canvas.removeEventListener('pointerleave', onHoverLeave);
        canvas.style.cursor = '';
      }
      disposeObject(scene);
      lights.key.shadow.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
