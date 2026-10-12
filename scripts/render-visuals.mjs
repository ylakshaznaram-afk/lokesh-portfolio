/**
 * Renders the static fallback images for the three 3D sculptures from their
 * deterministic still poses, plus the hotspot coordinates for each image.
 *
 *   1. npm run dev            (serves /lab.html on http://localhost:5173)
 *   2. npm run render:visuals (needs Playwright: `npm i -D playwright` or set
 *                              PLAYWRIGHT_MODULE to an installed copy)
 *
 * Output: src/assets/visuals/<scene>-<variant>-<width>.webp and hotspots.json.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
    throw new Error('Playwright not found. Install it (npm i -D playwright) or set PLAYWRIGHT_MODULE.');
  }
})();

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'src/assets/visuals');
const BASE = process.env.LAB_URL || 'http://localhost:5173/lab.html';
const QUALITY = 0.86;

// variant → [aspect width, aspect height], rendered at each listed pixel width
const JOBS = {
  prism: { square: { aspect: [1, 1], widths: [1200, 640] } },
  ribbon: {
    card: { aspect: [4, 3], widths: [1600, 880] }, // featured card
    wide: { aspect: [16, 10], widths: [1600, 960] }, // case-study header
    square: { aspect: [1, 1], widths: [1400, 800] }, // narrow screens + tall featured frame on wide screens
  },
  constellation: {
    card: { aspect: [16, 10], widths: [1200, 680] },
    square: { aspect: [1, 1], widths: [800] },
  },
  graph: { card: { aspect: [16, 10], widths: [1000, 560] } }, // demo control panel
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const hotspots = {};
await mkdir(OUT, { recursive: true });

for (const [scene, variants] of Object.entries(JOBS)) {
  hotspots[scene] = {};
  for (const [variant, { aspect, widths }] of Object.entries(variants)) {
    for (const w of widths) {
      const h = Math.round((w * aspect[1]) / aspect[0]);
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE}?scene=${scene}&mode=still&w=${w}&h=${h}&dpr=1`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__lab, null, { timeout: 60000 });
      await page.evaluate(() => window.__lab.ready);
      await page.waitForTimeout(400);
      const dataUrl = await page.evaluate((q) => window.__lab.exportImage('image/webp', q), QUALITY);
      if (!dataUrl.startsWith('data:image/webp')) throw new Error(`${scene}: browser did not encode WebP`);
      const file = `${scene}-${variant}-${w}.webp`;
      await writeFile(path.join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
      if (w === widths[0]) {
        const pts = await page.evaluate(() => window.__lab.hotspots);
        hotspots[scene][variant] = Object.fromEntries(
          Object.entries(pts).map(([id, p]) => [id, { x: +p.x.toFixed(2), y: +p.y.toFixed(2) }]),
        );
      }
      if (errors.length) throw new Error(`${scene}: ${errors.join('; ')}`);
      console.log(`✓ ${file}`);
      await page.close();
    }
  }
}

await writeFile(path.join(OUT, 'hotspots.json'), JSON.stringify(hotspots, null, 2) + '\n');
console.log('✓ hotspots.json');
await browser.close();
