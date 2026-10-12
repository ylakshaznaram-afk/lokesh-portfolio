/**
 * Build-time prerender entry. `npm run build` renders the first screen (nav,
 * hero, highlights) to HTML so the name and hero image arrive in the initial
 * response; the client then hydrates it (see main.tsx and scripts/prerender.mjs).
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
