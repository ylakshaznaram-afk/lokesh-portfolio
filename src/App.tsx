import { startTransition, useEffect, useState } from 'react';
import { About } from './components/About';
import { CaseDialog } from './components/CaseDialog';
import { Contact } from './components/Contact';
import { Credibility } from './components/Credibility';
import { Demo } from './components/Demo';
import { Experience } from './components/Experience';
import { Expertise } from './components/Expertise';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { Work } from './components/Work';
import { useCaseRouter } from './hooks/useCaseRouter';
import { useReveal } from './hooks/useReveal';

export function App() {
  const router = useCaseRouter();
  useReveal();

  // Hero and highlights render first; the rest follows in an interruptible
  // transition so the initial render never blocks input.
  const [rest, setRest] = useState(false);
  useEffect(() => startTransition(() => setRest(true)), []);
  useEffect(() => {
    if (!rest) return;
    const id = window.location.hash.slice(1);
    if (id && !id.startsWith('work/')) document.getElementById(id)?.scrollIntoView();
  }, [rest]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero onOpenCase={router.open} />
        <Credibility />
        {rest && (
          <>
            <Work morphSlug={router.morphSlug} openSlug={router.openSlug} onOpen={router.open} />
            <Demo />
            <Expertise />
            <Experience />
            <About />
            <Contact />
          </>
        )}
      </main>
      {rest && <Footer />}
      <CaseDialog slug={router.openSlug} onClose={router.close} onNavigate={router.navigate} />
    </>
  );
}
