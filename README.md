# Lokesh Gadchanda — Portfolio

"The Conversation Engine": a single-page portfolio for a ServiceNow Developer & Conversational Designer.
React + TypeScript + Vite, plain CSS design tokens, and a lazy-loaded three.js hero.

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build
```

`dist/` is a static site with relative asset paths (`base: './'`), so it can be hosted from a domain root or a sub-path (GitHub Pages, Netlify, Vercel, S3, etc.).

## Where things live

| Path | What |
| --- | --- |
| `src/data/content.ts` | **All professional content**: profile, highlights, case studies, expertise, experience, education. Edit here only. |
| `src/data/demo.ts` | Scripted, synthetic flows for the interactive concept demo. |
| `src/engine/` | Conversation Engine: `EngineStatic.tsx` (SVG, first paint + fallback), `engine3d.ts` (WebGL, lazy), `HeroEngine.tsx` (mode switching + accessible controls). |
| `src/components/visuals/` | Original SVG illustrations for the four case studies (synthetic data). |
| `src/styles/` | `tokens.css` (colour, type, spacing, motion), `base.css`, `sections.css`. |
| `public/` | Favicons, social preview image (`og-image.png`), robots.txt. |

## Before publishing — content dependencies

1. **Confirm current employment.** The Deloitte role shows `May 2024 – Present`, as listed on the resume. Update `experience[0].end` in `content.ts` if it has changed.
2. **Safran India role details.** The brief gave title and dates only, so no contributions are shown. Add 2–3 resume-backed points to `experience[3].points` if wanted.
3. **Resume download (optional).** No resume file was supplied, so no download button is shown. Add the PDF to `public/` and set `profile.resumeUrl` (for example `'./Lokesh-Gadchanda-Resume.pdf'`). The button appears automatically.
4. **Absolute social URLs.** Once the domain is known, set absolute `og:image`/`twitter:image` URLs and add `og:url` plus `<link rel="canonical">` in `index.html`. Some social platforms ignore relative preview images.
5. **Screenshots (optional).** All case-study visuals are recreated illustrations, labelled as such. Approved production screenshots can replace them in `CaseVisual`.

## Behaviour notes

- **3D vs static engine.** The WebGL scene loads after first paint on wide screens with capable hardware. The static SVG is used on screens under 900px, with `prefers-reduced-motion`, Save-Data, ≤2 cores or <4 GB memory, software WebGL renderers, when early frames are slow, or after WebGL context loss. Rendering pauses offscreen, in background tabs and while a case study is open. Pixel ratio is capped at 1.75.
- **QA override.** `?engine=3d` forces the WebGL scene (and disables the slow-frame fallback). `?engine=static` forces the SVG.
- **Deep links.** Each case study opens at `#work/<slug>`, for example `#work/nlu-it-self-service`. The browser Back button closes it.
- **Demo.** It runs entirely in the browser with synthetic data. It has no text input, so it never collects personal information.

## Verified (local production build)

- Automated Playwright checks for navigation, all four case studies (open, next, close, Escape, Back, deep link, focus return), all three demo scenarios including fallback and handoff, keyboard use, copy-email feedback, external links, mobile menu, reduced motion and no console errors.
- Layouts at 1440×900, 834×1112 and 390×844 with no horizontal overflow.
- Lighthouse 12 (localhost, headless Chromium): mobile Performance 98 (LCP 2.2 s, TBT 30 ms, CLS 0), desktop 100; Accessibility, Best Practices and SEO 100. Headless Chromium has no GPU, so these desktop numbers use the static engine. WebGL cost on real GPUs should be checked on target devices after deployment.
