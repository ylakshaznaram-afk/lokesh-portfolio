/**
 * Everything below the first screen, loaded as its own chunk after the
 * prerendered hero has hydrated.
 */
import { useEffect } from 'react';
import { About } from './components/About';
import { CaseDialog } from './components/CaseDialog';
import { Contact } from './components/Contact';
import { Demo } from './components/Demo';
import { Experience } from './components/Experience';
import { Expertise } from './components/Expertise';
import { Footer } from './components/Footer';
import { Work } from './components/Work';
import { slugFromHash, type CaseRouter } from './hooks/useCaseRouter';

/** Sections inside <main>. */
export function RestMain({ router }: { router: CaseRouter }) {
  // A direct link to a section (e.g. #experience) can only land once the section exists.
  // A case-study link that no longer matches a project falls back to the work section.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const id = hash.startsWith('work/') ? (slugFromHash() ? '' : 'work') : hash;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  }, []);
  return (
    <>
      <Work morphSlug={router.morphSlug} openSlug={router.openSlug} onOpen={router.open} />
      <Demo />
      <Expertise />
      <Experience />
      <About />
      <Contact />
    </>
  );
}

/** Footer and the case-study dialog, after <main>. */
export function RestAfter({ router }: { router: CaseRouter }) {
  return (
    <>
      <Footer />
      <CaseDialog slug={router.openSlug} onClose={router.close} onNavigate={router.navigate} />
    </>
  );
}
