/**
 * Renders public/og-image.png (1200×630) from the site's own type and the
 * Dialogue Prism still, plus the PNG favicons from public/favicon.svg. Run after `npm run render:visuals`:
 *   PLAYWRIGHT_MODULE=… node scripts/render-og.mjs
 */
import { readFile } from 'node:fs/promises';
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
const b64 = async (p) => (await readFile(path.join(ROOT, p))).toString('base64');
const display = await b64('public/fonts/bricolage-grotesque-latin-var.woff2');
const inter = await b64('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const prism = await b64('src/assets/visuals/prism-square-1200.webp');

const html = `<!doctype html><html><head><style>
@font-face{font-family:D;src:url(data:font/woff2;base64,${display}) format('woff2-variations');font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:I;src:url(data:font/woff2;base64,${inter}) format('woff2-variations');font-weight:100 900}
html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;position:relative;color:#F3F5F7;font-family:I;
  background:radial-gradient(640px 460px at 82% 18%,rgba(141,190,255,.11),transparent 70%),radial-gradient(520px 420px at 0% 100%,rgba(142,240,204,.06),transparent 70%),#080B10}
.name{position:absolute;left:72px;top:150px;font-family:D;font-weight:720;font-stretch:88%;font-variation-settings:'opsz' 96;
  font-size:118px;line-height:.86;letter-spacing:-.02em;text-transform:uppercase}
.name span{display:block;white-space:nowrap}
.role{position:absolute;left:74px;top:398px;font-family:D;font-weight:560;font-size:32px;letter-spacing:-.015em;display:flex;align-items:center;gap:16px}
.role:before{content:'';width:13px;height:13px;border-radius:4px;background:#8EF0CC}
.focus{position:absolute;left:74px;bottom:66px;font:500 15px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#8A95A5}
.mark{position:absolute;left:72px;top:64px}
.prism{position:absolute;right:-30px;top:40px;width:560px;height:560px;object-fit:contain}
</style></head><body>
<svg class="mark" width="52" height="52" viewBox="0 0 40 40"><rect x=".75" y=".75" width="38.5" height="38.5" rx="11" fill="#121821" stroke="rgba(243,245,247,.16)"/><path d="M11 11v18h8" fill="none" stroke="#F3F5F7" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30.6 15.4A6.5 6.5 0 1 0 30.6 24.6V21H26" fill="none" stroke="#8EF0CC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
<img class="prism" src="data:image/webp;base64,${prism}" alt="">
<div class="name"><span>Lokesh</span><span>Gadchanda</span></div>
<div class="role">ServiceNow Developer &amp; Conversational Designer</div>
<div class="focus">Virtual Agent · Conversational UX · Integrations</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(ROOT, 'public/og-image.png') });
console.log('✓ public/og-image.png');

// PNG favicons from the SVG mark.
const svg = await readFile(path.join(ROOT, 'public/favicon.svg'), 'utf8');
for (const [file, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0;background:#080B10">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: path.join(ROOT, 'public', file), omitBackground: file === 'favicon-32.png' });
  console.log(`✓ public/${file}`);
}
await browser.close();
