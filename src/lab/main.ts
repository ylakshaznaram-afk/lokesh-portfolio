/**
 * Dev-only harness for the 3D sculptures (not part of the production build).
 *
 *   /lab.html?scene=prism|ribbon|constellation
 *     &mode=live|still   (default live)
 *     &w=900&h=900       (stage size in CSS px; default fills the window)
 *     &select=<id> &hover=<id>
 *     &bg=%23121821      (page background; default obsidian)
 *     &dots=1            (draw hotspot markers)
 *
 * window.__lab exposes { ready, hotspots, ids, exportImage(type, quality) }.
 */
import { sceneLoaders } from '../three/registry';
import type { HotspotMap, SceneHandle, SceneKey } from '../three/types';

const q = new URLSearchParams(location.search);
const key = (q.get('scene') || 'prism') as SceneKey;
const mode = q.get('mode') === 'still' ? 'still' : 'live';
const stage = document.getElementById('stage')!;
const info = document.getElementById('info')!;
const w = Number(q.get('w')) || window.innerWidth;
const h = Number(q.get('h')) || window.innerHeight;
stage.style.width = `${w}px`;
stage.style.height = `${h}px`;
if (q.get('bg')) document.documentElement.style.setProperty('--bg', q.get('bg'));

const canvas = document.createElement('canvas');
stage.appendChild(canvas);

let hotspots: HotspotMap = {};
let resolveReady: () => void;
const ready = new Promise<void>((r) => (resolveReady = r));
let handle: SceneHandle | null = null;
let ids: readonly string[] = [];

function drawDots(points: HotspotMap) {
  if (q.get('dots') !== '1') return;
  stage.querySelectorAll('.hs').forEach((n) => n.remove());
  for (const [id, p] of Object.entries(points)) {
    const d = document.createElement('div');
    d.className = 'hs';
    d.style.left = `${p.x}%`;
    d.style.top = `${p.y}%`;
    d.innerHTML = `<i></i>${id}`;
    stage.appendChild(d);
  }
}

sceneLoaders[key]().then((mod) => {
  ids = mod.hotspotIds;
  let frames = 0;
  handle = mod.create({
    canvas,
    container: stage,
    still: mode === 'still',
    maxDpr: Number(q.get('dpr')) || 2,
    onHotspots: (p) => {
      hotspots = p;
      if (mode === 'still' || ++frames % 10 === 0) drawDots(p);
    },
    onReady: () => resolveReady(),
    onSlow: () => (info.textContent += ' [slow frames reported]'),
  });
  if (q.get('select')) handle.setSelected(q.get('select'));
  if (q.get('hover')) handle.setHovered(q.get('hover'));
  if (mode === 'still') handle.renderStill();
  else handle.start();
  info.textContent = `${key} · ${mode} · ${w}×${h}`;
});

(window as unknown as { __lab: unknown }).__lab = {
  ready,
  get hotspots() {
    return hotspots;
  },
  get ids() {
    return ids;
  },
  /** Export the current frame (still mode). */
  exportImage(type = 'image/webp', quality = 0.9) {
    handle?.renderStill();
    return canvas.toDataURL(type, quality);
  },
};
