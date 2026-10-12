# Lokesh Gadchanda — Portfolio

A name-led personal portfolio for a ServiceNow Developer & Conversational Designer: modern dark, three original 3D sculptures, and an asymmetric bento of project work.
React + TypeScript + Vite, plain CSS design tokens, and plain three.js (lazy-loaded).

```bash
npm install
npm run dev              # local dev server (also serves the 3D lab at /lab.html)
npm run build            # type-check + production build → dist/
npm run preview          # serve the production build
npm run render:visuals   # re-render the static 3D fallbacks (dev server must be running)
npm run render:og        # re-render og-image.png and the PNG favicons
```

The two render scripts need Playwright (`npm i -D playwright`, or point `PLAYWRIGHT_MODULE` at an installed copy). They are only needed after changing a 3D scene or the brand mark — the generated files are committed.

## Deployment

Live at **https://ylakshaznaram-afk.github.io/lokesh-portfolio/**.

`.github/workflows/deploy.yml` builds the site and deploys it to GitHub Pages on every push to `main` (or manually from the Actions tab). `dist/` uses relative asset paths (`base: './'`), so it works under the `/lokesh-portfolio/` sub-path or any other location. Routing is hash-based (`#work`, `#work/<case-study>`), so direct links and refreshes work on static hosting.

If the site moves to another domain, update `og:url`, `og:image`, `twitter:image` and `canonical` in `index.html`.

## Where things live

| Path | What |
| --- | --- |
| `src/data/content.ts` | **All professional content** — profile, highlights, projects and case studies, ribbon stages, constellation topology, expertise, experience, education. Edit here only. |
| `src/data/demo.ts` | Scripted, synthetic flows for the interactive conversation demo. |
| `src/three/` | The 3D system: `kit.ts` (shared materials, light rig, light-travel shader, helpers), `prism.ts` / `ribbon.ts` / `constellation.ts` / `graph.ts` (the sculptures), `activation.ts` (only the most visible scene renders), `capability.ts` (when live 3D is offered), `types.ts` (scene contract). |
| `src/components/Visual3D.tsx` | Hosts a sculpture: static image first, live canvas on top when allowed, HTML labels/controls positioned from the scene. |
| `src/assets/visuals/` | Static WebP renders of each sculpture (generated from the scenes' still poses) and their hotspot coordinates. |
| `src/components/work/` | Project visuals: ribbon + stage controls, constellation + component controls, and the two HTML/CSS 3D compositions (conversation panels, HR journey). |
| `src/components/visuals/` | Detailed SVG illustrations shown inside the case studies (synthetic data). |
| `src/styles/` | `tokens.css` (colour, type, spacing, motion), `base.css`, `sections.css`. |
| `public/` | Self-hosted display font (+ OFL licence), favicons, social preview image, robots.txt. |
| `lab.html`, `src/lab/` | Dev-only harness for the sculptures (not in the production build). |

## Before publishing — content dependencies

1. **Confirm current employment.** The Deloitte role shows `May 2024 – Present`, as listed on the resume. Update `experience[0].end` in `content.ts` if it has changed.
2. **Safran India role details.** Only title and dates were supplied, so no contributions are shown. Add 2–3 resume-backed points to `experience[3].points` if wanted.
3. **Resume download (optional).** No resume file was supplied, so no download buttons are shown. Add the PDF to `public/` and set `profile.resumeUrl` (e.g. `'./Lokesh-Gadchanda-Resume.pdf'`); the hero and contact buttons appear automatically.
4. **Cognizant testing details (optional).** No testing work was documented for the CMDB project, so its case study has no "Testing & edge cases" section. Add items to `testing` for that project in `content.ts` to show one.
5. **Screenshots (optional).** Project visuals are original sculptures and recreated interfaces with sample data, captioned as such. Approved production screenshots can replace the case-study illustrations in `src/components/visuals/`.

## Behaviour notes

- **Live 3D vs static.** Every sculpture shows its static render first. The live scene loads after first paint on capable hardware (phones included), and is skipped for `prefers-reduced-motion`, Save-Data, <4 cores or <4 GB memory, software WebGL renderers, slow early frames and WebGL context loss. Only the most visible sculpture renders; the others pause, and nothing renders while a case study is open or the tab is hidden. Pixel ratio is capped at 1.75.
- **Interaction.** Live sculptures can be dragged to turn (they spring back to their composed pose); clicking a ribbon gate or a constellation component selects it like its button; tapping the hero prism sends a light pulse from Request to Answer. The demo's Conversation Graph follows the chat stage by stage. Project illustrations turn toward the mouse.
- **QA override.** `?visuals=3d` forces live scenes (and disables the slow-frame fallback); `?visuals=static` forces images.
- **Deep links.** Each case study opens at `#work/<slug>` (e.g. `#work/cmdb-service-workflows`); Back closes it.
- **Demo.** Runs entirely in the browser with sample data and has no text input, so it never collects personal information.
