/**
 * Dialogue Prism — hero sculpture.
 *
 * Two thick, bevelled speech-inspired slabs in a three-quarter composition:
 * the request in soft, rounded smoked glass in front; the answer in crisper
 * brushed satin metal behind it, offset down-right. Each slab carries one
 * sculpted heel (a thick, tapered extension of a lower corner — the quietest
 * abstraction of a speech tail), and the two are turned a few degrees toward
 * each other across an open gap so they read as two speakers rather than a
 * stack of cards.
 *
 * A luminous filament forms inside the glass, drifts back through the gap in
 * one soft curve (seen through, and refracted by, the glass) and settles into
 * a single straight hairline inlaid in the metal, ending in a small dark
 * ceramic "full stop" that holds an ice-blue point: a request becoming a
 * clear answer. Light packets travel along it in a slow, conversational
 * rhythm.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CurvePath,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeUtils,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  addLightRig,
  autoResize,
  contactShadow,
  createLoop,
  createRenderer,
  disposeObject,
  ease,
  fitDistance,
  glowSprite,
  materials,
  PALETTE,
  pointerTracker,
  projectHotspots,
} from './kit';
import type { SceneHandle, SceneOptions } from './types';

export const hotspotIds = ['request', 'answer'] as const;

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

interface Corner {
  x: number;
  y: number;
  /** Fillet radius at this vertex. */
  r: number;
  /** Bezier handle multiplier: 1 = circular arc, > 1 = squircle-like shoulder. */
  sq?: number;
}

/** Closed outline through `pts` with every vertex filleted by a (near) circular arc. */
function roundedPolygon(pts: Corner[]) {
  const s = new Shape();
  const n = pts.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n];
    const v = pts[i];
    const q = pts[(i + 1) % n];
    let ax = p.x - v.x;
    let ay = p.y - v.y;
    const al = Math.hypot(ax, ay);
    ax /= al;
    ay /= al;
    let bx = q.x - v.x;
    let by = q.y - v.y;
    const bl = Math.hypot(bx, by);
    bx /= bl;
    by /= bl;
    const interior = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by)));
    const turn = Math.PI - interior;
    const d = v.r / Math.tan(interior / 2); // tangent-point distance from the vertex
    const h = (4 / 3) * Math.tan(turn / 4) * v.r * (v.sq ?? 1); // bezier handle length
    const t1x = v.x + ax * d;
    const t1y = v.y + ay * d;
    const t2x = v.x + bx * d;
    const t2y = v.y + by * d;
    if (i === 0) {
      s.moveTo(t1x, t1y);
      sx = t1x;
      sy = t1y;
    } else s.lineTo(t1x, t1y);
    s.bezierCurveTo(t1x - ax * h, t1y - ay * h, t2x - bx * h, t2y - by * h, t2x, t2y);
  }
  s.lineTo(sx, sy);
  return s;
}

interface FormSpec {
  w: number;
  h: number;
  /** Shoulder radius of the three soft corners. */
  r: number;
  /** Heel: how far the tail tip drops below the base line and steps outward. */
  drop: number;
  out: number;
}

/**
 * Speech-inspired outline: a soft squircle slab whose lower corner grows into
 * a thick, tapered heel (tip rounded r 0.035, inner join filleted r 0.11).
 * `side` -1 puts the heel bottom-left (the request), +1 bottom-right (the answer).
 */
function speechShape({ w, h, r, drop, out }: FormSpec, side: 1 | -1) {
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = -h / 2;
  const y1 = h / 2;
  const taper = (38 * Math.PI) / 180; // angle of the heel's underside
  const tipX = x0 - out;
  const tipY = y0 - drop;
  const join = tipX + drop / Math.tan(taper);
  const SQ = 1.12;
  // authored counter-clockwise with the heel bottom-left
  const pts: Corner[] = [
    { x: join, y: y0, r: 0.11 },
    { x: x1, y: y0, r, sq: SQ },
    { x: x1, y: y1, r, sq: SQ },
    { x: x0, y: y1, r, sq: SQ },
    { x: tipX, y: tipY, r: 0.035 },
  ];
  if (side === 1) {
    // mirror (and keep counter-clockwise order)
    pts.reverse();
    for (const p of pts) p.x = -p.x;
  }
  return roundedPolygon(pts);
}

function roundedRectShape(w: number, h: number, r: number) {
  return roundedPolygon([
    { x: -w / 2, y: -h / 2, r },
    { x: w / 2, y: -h / 2, r },
    { x: w / 2, y: h / 2, r },
    { x: -w / 2, y: h / 2, r },
  ]);
}

/** Extrude a shape centred on z, with creased normals for clean, unfaceted highlights. */
function slab(shape: Shape, depth: number, bevelT: number, bevelS: number, curveSegments = 22) {
  const raw = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevelT,
    bevelSize: bevelS,
    bevelSegments: 7,
    curveSegments,
  });
  raw.translate(0, 0, -depth / 2);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  const merged = mergeVertices(raw, 1e-4);
  raw.dispose();
  const out = toCreasedNormals(merged, Math.PI / 3.5) as BufferGeometry;
  merged.dispose();
  // Keep the caps optically flat: their long triangulation fans would otherwise
  // interpolate the bevel's averaged rim normals across the face and print the
  // triangulation into reflections (a false diagonal "band" on the glass).
  const pos = out.getAttribute('position');
  const nor = out.getAttribute('normal');
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1).sub(a);
    c.fromBufferAttribute(pos, i + 2).sub(a);
    b.cross(c).normalize();
    if (Math.abs(b.z) > 0.99999) for (let k = 0; k < 3; k++) nor.setXYZ(i + k, 0, 0, Math.sign(b.z));
  }
  return out;
}

/**
 * Planar uvs plus a tangent frame for the anisotropic satin finish. The
 * tangent is a fixed brush direction D projected onto the surface: on the
 * faces it runs along x (the direction of the answer line); on the walls it
 * turns smoothly toward the depth axis. D = (1, 0, -0.3) is only parallel to
 * the normal on bevels the three-quarter view never shows, so the field has
 * no visible seams or degenerate points.
 */
function addBrushFrame(geo: BufferGeometry) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const tan = new Float32Array(n * 4);
  const dx = 1;
  const dz = -0.3;
  for (let i = 0; i < n; i++) {
    uv[i * 2] = pos.getX(i);
    uv[i * 2 + 1] = pos.getY(i);
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    const nd = nx * dx + nz * dz;
    const tx = dx - nx * nd;
    const ty = -ny * nd;
    const tz = dz - nz * nd;
    const l = Math.hypot(tx, ty, tz) || 1;
    tan[i * 4] = tx / l;
    tan[i * 4 + 1] = ty / l;
    tan[i * 4 + 2] = tz / l;
    tan[i * 4 + 3] = 1;
  }
  geo.setAttribute('uv', new BufferAttribute(uv, 2));
  geo.setAttribute('tangent', new BufferAttribute(tan, 4));
  return geo;
}

/**
 * Selection accent: a hairline riding the bevel apex (where the bevel turns
 * through ~55°), so it reads as light catching the edge rather than a UI
 * outline. Additive and transparent, so the glass's transmission pass never
 * captures (and refracts) it.
 */
function edgeRing(shape: Shape, depth: number, bt: number, bs: number) {
  const theta = 0.95;
  const tube = 0.0035;
  // outward normal of the elliptical bevel profile at theta
  const en = new Vector2(Math.sin(theta) / bs, Math.cos(theta) / bt).normalize();
  const off = bs * Math.sin(theta) + en.x * tube * 1.3;
  const z = depth / 2 + bt * Math.cos(theta) + en.y * tube * 1.3;
  const src = shape.getSpacedPoints(200).slice(0, -1);
  const ccw = !ShapeUtils.isClockWise(src);
  const m = src.length;
  const pts: Vector3[] = [];
  for (let i = 0; i < m; i++) {
    const a = src[(i + m - 1) % m];
    const b = src[(i + 1) % m];
    let nx = b.y - a.y;
    let ny = a.x - b.x;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (!ccw) {
      nx = -nx;
      ny = -ny;
    }
    pts.push(new Vector3(src[i].x + nx * off, src[i].y + ny * off, z));
  }
  const curve = new CatmullRomCurve3(pts, true, 'centripetal');
  const SEG = 360;
  const RAD = 5;
  const geo = new TubeGeometry(curve, SEG, tube, RAD, true);
  // Brightest where the edge faces the key light (upper left), so the accent
  // reads as a glint travelling round the bevel rather than a uniform stroke.
  const col = new Float32Array(geo.getAttribute('position').count * 3);
  const t = new Vector3();
  const lx = -0.45;
  const ly = 0.89;
  for (let i = 0; i <= SEG; i++) {
    curve.getTangentAt((i % SEG) / SEG, t);
    const facing = ccw ? t.y * lx - t.x * ly : -t.y * lx + t.x * ly;
    const k = Math.min(1, Math.max(0, (facing + 0.5) / 1.4));
    const g = 0.35 + 0.65 * k * k * (3 - 2 * k);
    for (let j = 0; j <= RAD; j++) col.fill(g, (i * (RAD + 1) + j) * 3, (i * (RAD + 1) + j) * 3 + 3);
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
  const ring = new Mesh(
    geo,
    new MeshBasicMaterial({
      color: PALETTE.mint,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  ring.renderOrder = 4;
  ring.visible = false;
  return ring;
}

/** Soft radial pool used for the cool floor bounce (additive). */
function bounceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

interface Softbox {
  /** Environment-space direction (from the probe) the strip sits in. */
  dir: Vector3;
  /** Tilt about the view axis (0 = horizontal). */
  roll: number;
  /** Radiance multiplier. */
  intensity: number;
  /** Angular width in degrees. */
  width: number;
}

/**
 * The kit's neutral studio (RoomEnvironment) plus long, narrow softbox
 * strips placed exactly where a face mirrors the environment at rest: a soft
 * diagonal band of reflected light across the smoked glass, and a horizontal
 * one the brushed metal stretches into a satin sheen. Because they are real
 * reflections they glide over the faces as the sculpture turns.
 */
function studioWithSoftboxes(renderer: WebGLRenderer, scene: Scene, boxes: Softbox[]) {
  const room = new RoomEnvironment();
  const D = 4; // in front of the room's boxes, so nothing occludes a strip
  const look = new Object3D();
  const extra: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  for (const b of boxes) {
    const strip = new Mesh(
      new PlaneGeometry(D * 1.1, D * Math.tan((b.width * Math.PI) / 180)),
      new MeshBasicMaterial({ color: new Color().setScalar(b.intensity), side: DoubleSide }),
    );
    look.position.copy(b.dir).multiplyScalar(D);
    look.quaternion.identity();
    look.lookAt(0, 0, 0);
    look.rotateZ(b.roll);
    strip.quaternion.copy(look.quaternion);
    strip.position.copy(look.position);
    strip.position.y -= room.position.y; // the room scene is offset; keep the strip at `dir` from the probe
    room.add(strip);
    extra.push(strip);
  }
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.035).texture;
  pmrem.dispose();
  room.dispose();
  for (const m of extra) {
    m.geometry.dispose();
    m.material.dispose();
  }
  scene.environment = env;
  scene.environmentIntensity = 0.7;
  return env;
}

/**
 * Re-profile a tube's radius along its length: ring i is scaled about the
 * path point at u = i / segments. Lets the filament emerge thin out of the
 * smoke and settle into a finer hairline on the metal.
 */
function profileTube(geo: TubeGeometry, path: CurvePath<Vector3>, segments: number, radial: number, scale: (u: number) => number) {
  const pos = geo.getAttribute('position');
  const c = new Vector3();
  const v = new Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    path.getPointAt(u, c);
    const k = scale(u);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(k).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Light-travel shader for the channel. uv.x runs along the path. The core is
 * opaque on purpose (it is drawn in the opaque pass, so the smoked glass
 * refracts it); the halo is additive. Vertices are lifted with the form they
 * belong to (uLiftA for the glass section, uLiftB for the metal section) so
 * the channel stays continuous when a form rises on selection.
 */
function channelMaterial(halo: boolean) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(PALETTE.mint) },
      uAnswer: { value: new Color(PALETTE.ice) },
      uBase: { value: new Color(halo ? 0x000000 : 0x2f8a72) },
      uHead: { value: -1 },
      uHead2: { value: -1 },
      uLength: { value: 0.2 },
      uIntensity: { value: halo ? 0.7 : 2.4 },
      uA1: { value: 0.5 },
      uB0: { value: 0.62 },
      uSelA: { value: 0 },
      uSelB: { value: 0 },
      uArrive: { value: 0 },
      uLiftA: { value: 0 },
      uLiftB: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uA1;
      uniform float uB0;
      uniform float uLiftA;
      uniform float uLiftB;
      varying vec2 vUv;
      varying float vNdv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += mix(uLiftA, uLiftB, smoothstep(uA1, uB0, uv.x));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vNdv = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uAnswer;
      uniform vec3 uBase;
      uniform float uHead;
      uniform float uHead2;
      uniform float uLength;
      uniform float uIntensity;
      uniform float uA1;
      uniform float uB0;
      uniform float uSelA;
      uniform float uSelB;
      uniform float uArrive;
      varying vec2 vUv;
      varying float vNdv;
      float packet(float head) {
        if (head < -0.5) return 0.0;
        float d = vUv.x - head;
        float trail = smoothstep(-uLength, 0.0, d) * (1.0 - smoothstep(0.0, 0.016, d));
        return trail * trail;
      }
      void main() {
        float p = max(packet(uHead), packet(uHead2));
        float onMetal = smoothstep(uA1, uB0, vUv.x);
        float sel = mix(uSelA, uSelB, onMetal);
        // light cools from mint (request) to ice (answer) as it resolves
        vec3 tint = mix(uColor, uAnswer, onMetal * 0.55);
        float steady = sel * 0.3 + uArrive * onMetal * 0.5;
        // behind / inside the smoked glass the filament burns brighter so it survives the tint
        float veiled = 1.0 - smoothstep(uB0 - 0.05, uB0, vUv.x);
        // the request forms out of the smoke rather than entering from outside
        float birth = smoothstep(0.0, 0.16, vUv.x);
        ${
          halo
            ? `float a = (p * uIntensity + steady * 0.6) * pow(vNdv, 2.0) * birth;
        gl_FragColor = vec4(tint * a, a);`
            : `vec3 col = uBase * (1.0 + sel * 1.8) * (0.35 + 0.65 * birth) + tint * (p * uIntensity + steady) * birth;
        col *= (0.7 + 0.3 * vNdv) * (1.0 + veiled * 1.2);
        gl_FragColor = vec4(col, 1.0);`
        }
        #include <colorspace_fragment>
      }
    `,
    transparent: halo,
    depthWrite: !halo,
    blending: halo ? AdditiveBlending : NormalBlending,
    toneMapped: false,
  });
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const CYCLE = 6.4; // seconds per request → answer
const TRAVEL = 4.2; // seconds a packet spends in the channel
const GAP2 = 4.37; // second packet trails the first by CYCLE - GAP2 seconds
const STILL_T = 3.5; // rest pose: one packet resolving on the metal, one inside the glass
const LIFT = 0.07; // selected form rises this much
const HOVER = 0.3; // hover emphasis relative to selection

const ZERO = { x: 0, y: 0 };

export function create(opts: SceneOptions): SceneHandle {
  const { canvas, container, still = false } = opts;
  const renderer = createRenderer(canvas, opts.maxDpr ?? 1.75, still);
  const scene = new Scene();
  const rig = addLightRig(scene);
  rig.key.intensity = 1.8;
  rig.rim.intensity = 1.5;
  rig.fill.intensity = 0.5;
  rig.fill.position.x = -0.5; // keep the mint fill off the metal's right bevel
  // turn the studio for a soft diagonal sheen on the faces (softboxes are aimed below)
  scene.environmentRotation.set(0.15, -0.5, 0);

  const camera = new PerspectiveCamera(28, 1, 0.1, 60);
  const root = new Group(); // ambient sway + pointer
  scene.add(root);
  const sculpture = new Group(); // fixed three-quarter turn
  sculpture.rotation.y = -0.58;
  root.add(sculpture);

  /* --- forms ------------------------------------------------------ */
  // Request: soft, rounded smoked glass in front, heel bottom-left. Answer:
  // crisper satin metal behind it, offset down-right, heel bottom-right. The
  // two are turned ~15° toward each other across an open gap.
  const G = { w: 1.36, h: 1.04, r: 0.46, drop: 0.15, out: 0.05, depth: 0.24, bt: 0.09, bs: 0.07, x: -0.28, y: 0.22, z: 0.29, ry: 0.12 };
  const M = { w: 1.58, h: 0.92, r: 0.28, drop: 0.13, out: 0.045, depth: 0.16, bt: 0.08, bs: 0.06, x: 0.26, y: -0.14, z: -0.29, ry: -0.14 };
  const glassHalf = G.depth / 2 + G.bt;
  const metalFront = M.depth / 2 + M.bt; // metal-local z of the front face

  const glassPivot = new Group();
  glassPivot.position.set(G.x, G.y, G.z);
  glassPivot.rotation.y = G.ry;
  const glassMat = materials.smokedGlass({
    thickness: 0.8,
    attenuationColor: new Color(0x384350),
    attenuationDistance: 1.3,
    roughness: 0.08,
    dispersion: 0.2,
  });
  const glassShape = speechShape(G, -1);
  const glass = new Mesh(slab(glassShape, G.depth, G.bt, G.bs), glassMat);
  const glassRing = edgeRing(glassShape, G.depth, G.bt, G.bs);
  glassPivot.add(glass, glassRing);

  const metalPivot = new Group();
  metalPivot.position.set(M.x, M.y, M.z);
  metalPivot.rotation.y = M.ry;
  const metalMat = materials.satinMetal({
    color: 0x9ea6b0,
    roughness: 0.28,
    envMapIntensity: 0.85,
    anisotropy: 0.5,
    anisotropyRotation: 0,
  });
  const metalShape = speechShape(M, 1);
  const metal = new Mesh(addBrushFrame(slab(metalShape, M.depth, M.bt, M.bs)), metalMat);
  const metalRing = edgeRing(metalShape, M.depth, M.bt, M.bs);
  metalPivot.add(metal, metalRing);
  sculpture.add(glassPivot, metalPivot);
  glassPivot.updateMatrix();
  metalPivot.updateMatrix();
  const inGlass = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(glassPivot.matrix);
  const onMetal = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(metalPivot.matrix);

  /* --- channel ---------------------------------------------------- */
  // Forms inside the glass, drifts back across the gap in one soft curve, and
  // settles onto the metal as a single straight hairline ending in a full stop.
  const lineY = 0.18; // metal-local: the upper third, like the first line of a reply
  const landX = -0.2; // metal-local x where the light touches the metal (behind the glass)
  const stopX = M.w / 2 - 0.11; // the full stop, ~0.08 in from the right bevel
  const LINE_Z = metalFront + 0.003; // the hairline rides just proud of its inlay
  const landing = onMetal(landX, lineY, LINE_Z);
  const lineEnd = onMetal(stopX, lineY, LINE_Z);
  // gap point: halfway between the glass's back face and the metal's front face
  const gapA = inGlass(0.12, M.y + lineY + 0.06 - G.y, -glassHalf);
  const gapB = onMetal((gapA.x - M.x) / Math.cos(M.ry), lineY + 0.06, metalFront);
  const gapMid = gapA.clone().add(gapB).multiplyScalar(0.5);
  const yL = M.y + lineY - G.y; // line height in glass-local y
  const request = new CatmullRomCurve3(
    [
      inGlass(-G.w / 2 + 0.16, 0.2, 0.01),
      inGlass(-0.34, 0.15, -0.01),
      inGlass(-0.1, (0.15 + yL) / 2 - 0.02, -glassHalf + 0.03),
      gapMid,
      onMetal(landX - 0.14, lineY + 0.004, metalFront + 0.012),
      landing,
    ],
    false,
    'centripetal',
  );
  const path = new CurvePath<Vector3>();
  path.add(request);
  path.add(new LineCurve3(landing, lineEnd));
  const lenReq = request.getLength();
  const lenAll = lenReq + landing.distanceTo(lineEnd);
  const U_LAND = lenReq / lenAll; // where the light settles onto the metal
  const U_EXIT = U_LAND * 0.45; // where it leaves the glass body

  const coreMat = channelMaterial(false);
  const haloMat = channelMaterial(true);
  for (const m of [coreMat, haloMat]) {
    m.uniforms.uA1.value = U_EXIT;
    m.uniforms.uB0.value = U_LAND;
  }
  // radius profile: thin as it forms in the smoke, full in the glass, a finer hairline on the metal
  const CORE_R = 0.012;
  const radius = (u: number) => {
    const born = 0.35 + 0.65 * ease.inOutSine(Math.min(1, u / 0.14));
    const settle = 1 - 0.4 * ease.inOutSine(Math.min(1, Math.max(0, (u - U_LAND + 0.04) / 0.08)));
    return born * settle;
  };
  const core = new Mesh(profileTube(new TubeGeometry(path, 260, CORE_R, 8, false), path, 260, 8, radius), coreMat);
  const halo = new Mesh(profileTube(new TubeGeometry(path, 200, 0.04, 10, false), path, 200, 10, radius), haloMat);
  halo.renderOrder = 2;
  sculpture.add(core, halo);
  // one small soft glow per packet, shown once it reaches the open metal face
  const glows = [glowSprite(PALETTE.mint, 0.14, 0), glowSprite(PALETTE.mint, 0.14, 0)];
  for (const g of glows) {
    g.renderOrder = 3;
    sculpture.add(g);
  }

  // the answer line sits in a hairline of dark ceramic inlaid in the metal,
  // starting only where the line clears the glass's silhouette
  const inlayX0 = -0.06;
  const inlayLen = stopX - inlayX0;
  const inlay = new Mesh(
    slab(roundedRectShape(inlayLen, 0.024, 0.004), 0.002, 0.002, 0.002, 6),
    materials.darkCeramic({ color: 0x0b0e13, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
  );
  inlay.position.set(inlayX0 + inlayLen / 2, lineY, metalFront - 0.002); // top sits 0.001 proud
  // full stop: a small proud ceramic disc holding a soft ice-blue point
  const discProfile: Vector2[] = [new Vector2(0.0001, 0), new Vector2(0.03, 0)];
  for (let k = 0; k <= 6; k++) {
    const a = (k / 6) * (Math.PI / 2); // rounded top edge, so the rim catches a highlight
    discProfile.push(new Vector2(0.026 + 0.004 * Math.cos(a), 0.004 + 0.004 * Math.sin(a)));
  }
  discProfile.push(new Vector2(0.0001, 0.008));
  const stopDisc = new Mesh(
    new LatheGeometry(discProfile, 40),
    materials.darkCeramic({ color: 0x141920, clearcoat: 1, clearcoatRoughness: 0.08 }),
  );
  stopDisc.rotation.x = Math.PI / 2;
  stopDisc.position.set(stopX, lineY, metalFront - 0.001); // stands 0.007 proud of the face
  const stopPointMat = new MeshBasicMaterial({ color: PALETTE.ice, toneMapped: false });
  const stopPoint = new Mesh(new CircleGeometry(0.011, 24), stopPointMat);
  stopPoint.position.set(stopX, lineY, metalFront + 0.0075);
  const stopGlow = glowSprite(PALETTE.ice, 0.12, 0.12);
  stopGlow.position.set(stopX, lineY, metalFront + 0.03);
  stopGlow.renderOrder = 3;
  metalPivot.add(inlay, stopDisc, stopPoint, stopGlow);

  /* --- shadow ----------------------------------------------------- */
  const FLOOR = M.y - M.h / 2 - M.drop - M.bs - 0.15;
  const glassShadow = contactShadow(1.5, 0.55, 0.45);
  glassShadow.position.set(G.x, FLOOR, G.z);
  const metalShadow = contactShadow(1.75, 0.58, 0.6);
  metalShadow.position.set(M.x, FLOOR + 0.001, M.z);
  // a faint cool bounce pool, wider than the shadows' cores, so the shadows have
  // something to sit in on obsidian (black on #080B10 cannot read)
  const bounce = new Mesh(
    new PlaneGeometry(2.6, 0.9),
    new MeshBasicMaterial({
      map: bounceTexture(),
      color: PALETTE.ice,
      transparent: true,
      opacity: 0.07,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  bounce.rotation.x = -Math.PI / 2;
  bounce.position.set((G.x + M.x) / 2 + 0.12, FLOOR - 0.001, (G.z + M.z) / 2);
  bounce.renderOrder = -1;
  sculpture.add(bounce, glassShadow, metalShadow);

  /* --- hotspot anchors -------------------------------------------- */
  const requestAnchor = new Object3D();
  requestAnchor.position.set(-G.w / 2 + 0.12, G.h / 2 + 0.2, 0);
  glassPivot.add(requestAnchor);
  const answerAnchor = new Object3D();
  answerAnchor.position.set(M.w / 2 - 0.14, M.h / 2 + 0.2, 0);
  metalPivot.add(answerAnchor);
  const hotspotEntries: [string, Object3D][] = [
    ['request', requestAnchor],
    ['answer', answerAnchor],
  ];

  /* --- camera ----------------------------------------------------- */
  const target = new Vector3(0.02, -0.1, 0);
  let stillDrawn = false;
  const stopResize = autoResize(renderer, container, camera, () => {
    const dist = fitDistance(camera, 1.5, 1.08);
    camera.position.set(target.x + dist * 0.05, target.y + dist * 0.17, dist * 0.985);
    camera.lookAt(target);
    // keep the still frame in sync with container size changes
    if (still && stillDrawn) queueMicrotask(renderStill);
  });

  /* --- state + animation ------------------------------------------ */
  const pointer = pointerTracker(container, !still);
  const state = { selected: null as string | null, hovered: null as string | null };
  const anim = { g: 0, m: 0 };
  const chMats = [coreMat, haloMat];
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const emphasis = (id: string) => (state.selected === id ? 1 : state.hovered === id ? HOVER : 0);
  let snap = false;
  let frameDt = 0;
  const damp = (cur: number, to: number, lambda: number) => (snap ? to : ease.damp(cur, to, lambda, frameDt));

  const lift = { g: 0, m: 0 };
  const ringMats = [glassRing.material as MeshBasicMaterial, metalRing.material as MeshBasicMaterial];
  const stopBase = new Color(PALETTE.ice);
  function setRing(ring: Mesh, mat: MeshBasicMaterial, e: number) {
    ring.visible = e > 0.02;
    mat.opacity = e * 0.7; // peaks at ~70% mint
  }

  /** Place packet i's glow; returns how strongly it is arriving on the metal. */
  function packet(i: number, head: number) {
    const hc = head < 0 ? 0 : head > 1 ? 1 : head;
    const g = glows[i];
    path.getPointAt(hc, g.position);
    const w = clamp01((hc - U_EXIT) / (U_LAND - U_EXIT));
    g.position.y += lift.g + (lift.m - lift.g) * w * w * (3 - 2 * w);
    g.position.z += 0.03 * w;
    const alive = head < 0 ? 0 : clamp01(1 - (head - 1) * 7);
    // the glow only shows once the light is on the metal (the glass hides it before)
    g.material.opacity = clamp01((hc - U_LAND) / 0.06) * alive * 0.18;
    const since = (head - U_LAND) * TRAVEL; // seconds since it reached the metal
    return since > 0 ? Math.min(1, since * 3) * Math.exp(-since * 0.6) : 0;
  }

  function update(t: number, dt: number, snapNow = false) {
    snap = snapNow;
    frameDt = dt;
    const p = still || snapNow ? ZERO : pointer.update(0.06);

    // restrained ambient sway + pointer
    root.rotation.y = damp(root.rotation.y, Math.sin(t * 0.23) * 0.05 + p.x * 0.2, 3);
    root.rotation.x = damp(root.rotation.x, Math.sin(t * 0.17 + 1.1) * 0.012 + p.y * 0.05, 3);

    // selection / hover: the form rises a touch, catches more light, its edge
    // catches a mint glint and its stretch of channel holds a steady glow
    anim.g = damp(anim.g, emphasis('request'), 5);
    anim.m = damp(anim.m, emphasis('answer'), 5);
    const breathe = Math.sin(t * 0.55) * 0.012;
    lift.g = breathe + anim.g * LIFT;
    lift.m = breathe * 0.6 + anim.m * LIFT;
    glassPivot.position.y = G.y + lift.g;
    metalPivot.position.y = M.y + lift.m;
    glassShadow.material.opacity = 0.45 - anim.g * 0.1;
    metalShadow.material.opacity = 0.6 - anim.m * 0.12;
    glassMat.envMapIntensity = 1.1 + anim.g * 0.3;
    metalMat.envMapIntensity = 0.85 + anim.m * 0.2;
    setRing(glassRing, ringMats[0], anim.g);
    setRing(metalRing, ringMats[1], anim.m);
    for (let i = 0; i < 2; i++) {
      const u = chMats[i].uniforms;
      u.uLiftA.value = lift.g;
      u.uLiftB.value = lift.m;
      u.uSelA.value = anim.g;
      u.uSelB.value = anim.m;
    }

    // light travelling request → answer: two packets in an uneven, conversational rhythm
    const h1 = (t % CYCLE) / TRAVEL;
    const h2 = ((t + GAP2) % CYCLE) / TRAVEL;
    const arrive = Math.max(packet(0, h1), packet(1, h2));
    for (let i = 0; i < 2; i++) {
      const u = chMats[i].uniforms;
      u.uHead.value = h1;
      u.uHead2.value = h2;
      u.uArrive.value = arrive;
    }
    // the full stop answers each arrival with a soft brightening
    const lit = 0.75 + arrive * 0.7 + anim.m * 0.3;
    stopPointMat.color.copy(stopBase).multiplyScalar(lit);
    stopGlow.material.opacity = 0.1 + arrive * 0.22 + anim.m * 0.08;
  }

  function draw() {
    renderer.render(scene, camera);
    opts.onHotspots?.(projectHotspots(camera, hotspotEntries));
  }

  let readySent = false;
  const markReady = () => {
    if (readySent) return;
    readySent = true;
    opts.onReady?.();
  };
  function renderStill() {
    update(STILL_T, 1, true);
    draw();
    stillDrawn = true;
    markReady();
  }
  // start in the rest pose, so the live loop picks up exactly where the still image is
  update(STILL_T, 1, true);

  // Studio environment with softboxes aimed at each face's rest-pose mirror direction.
  scene.updateMatrixWorld();
  const envBasis = new Matrix4().makeRotationFromEuler(scene.environmentRotation).transpose();
  /**
   * Environment direction a face reflects toward the camera at rest. For an
   * anisotropic material the shader reflects about a "bent" normal (three's
   * getIBLAnisotropyRadiance), so mirror that here.
   */
  const mirrorDir = (mesh: Mesh, aniso = 0, rough = 0) => {
    const n = new Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
    const c = new Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const v = new Vector3(0.05, 0.17, 0.985).multiplyScalar(12).add(target).sub(c).normalize();
    if (aniso > 0) {
      const tng = new Vector3(1, 0, 0).transformDirection(mesh.matrixWorld);
      const bit = new Vector3().crossVectors(n, tng).normalize();
      const bent = v.clone().addScaledVector(bit, -bit.dot(v)).normalize();
      const k = Math.pow(1 - aniso * (1 - rough), 4);
      n.copy(bent.lerp(n, k).normalize());
    }
    // the shader samples envMapRotation * r, with envMapRotation = R(environmentRotation)^T
    return n.multiplyScalar(2 * n.dot(v)).sub(v).applyMatrix4(envBasis);
  };
  studioWithSoftboxes(renderer, scene, [
    { dir: mirrorDir(glass), roll: 0.55, intensity: 2.5, width: 2.6 },
    { dir: mirrorDir(metal, metalMat.anisotropy, metalMat.roughness).add(new Vector3(0, 0.15, 0)).normalize(), roll: 0, intensity: 1.0, width: 8 },
  ]);

  const loop = createLoop(
    renderer,
    (t, dt) => {
      update(t + STILL_T, dt);
      draw();
      markReady();
    },
    opts.onSlow,
  );

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    renderStill,
    setSelected: (id) => {
      state.selected = id;
    },
    setHovered: (id) => {
      state.hovered = id;
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
