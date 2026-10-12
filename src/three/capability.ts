/**
 * Decides whether live WebGL is worth running on this device. Everything
 * essential works without it: each sculpture has a static image fallback.
 *
 * QA override: `?visuals=3d` forces live scenes (and disables the slow-frame
 * fallback); `?visuals=static` forces images.
 */
const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('visuals') : null;

export const forced3D = forced === '3d';
export const forcedStatic = forced === 'static';

let cached: boolean | null = null;

/** Hardware/network capability only; motion and viewport preferences are checked live by the host. */
export function deviceSupports3D(): boolean {
  if (forced3D) return true;
  if (forcedStatic) return false;
  if (cached !== null) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let ok = true;
  if (nav.connection?.saveData) ok = false;
  else if (nav.hardwareConcurrency && nav.hardwareConcurrency < 4) ok = false;
  else if (nav.deviceMemory && nav.deviceMemory < 4) ok = false;
  else {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (!gl) ok = false;
      else {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
        // Software rasterisers make scenes janky; the static render is the better experience.
        if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) ok = false;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      ok = false;
    }
  }
  cached = ok;
  return ok;
}

/** Viewports where live 3D is offered (static images below this). */
export const LIVE_3D_MEDIA = '(min-width: 768px)';
