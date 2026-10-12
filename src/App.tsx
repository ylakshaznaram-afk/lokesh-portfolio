import { lazy, startTransition, Suspense, useEffect, useState } from 'react';
import { Backdrop } from './components/Backdrop';
import { Credibility } from './components/Credibility';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { useCaseRouter } from './hooks/useCaseRouter';
import { useReveal } from './hooks/useReveal';

// Below-the-fold sections ship as a separate chunk (one module, two mount points).
const RestMain = lazy(() => import('./Rest').then((m) => ({ default: m.RestMain })));
const RestAfter = lazy(() => import('./Rest').then((m) => ({ default: m.RestAfter })));

export function App() {
  const router = useCaseRouter();
  useReveal();

  // The first screen (prerendered at build time) hydrates first; the rest
  // follows in an interruptible transition so it never blocks input.
  const [rest, setRest] = useState(false);
  useEffect(() => startTransition(() => setRest(true)), []);

  return (
    <>
      <Backdrop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Credibility />
        {rest && (
          <Suspense fallback={null}>
            <RestMain router={router} />
          </Suspense>
        )}
      </main>
      {rest && (
        <Suspense fallback={null}>
          <RestAfter router={router} />
        </Suspense>
      )}
    </>
  );
}
