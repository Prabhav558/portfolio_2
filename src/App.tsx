import { Component, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { chapters, type ChapterId } from './config/chapters';
import { ScrollTrigger } from './lib/gsap';
import { scrollToChapter, setActiveChapter } from './lib/progressStore';
import SvgDefs from './components/SvgDefs';
import Navigation from './components/Navigation';
import ExperienceProgress from './components/ExperienceProgress';
import CustomCursor from './components/CustomCursor';
import CaseStudy from './pages/CaseStudy';
import OpeningSequence from './chapters/arrival/OpeningSequence';
import ChapterThreshold from './chapters/threshold/ChapterThreshold';
import ChapterGallery from './chapters/gallery/ChapterGallery';
import ChapterTransformation from './chapters/transformation/ChapterTransformation';
import ChapterRevelation from './chapters/revelation/ChapterRevelation';
import FinalTitle from './chapters/finale/FinalTitle';

/** '#/work/<slug>' opens a case study; anything else shows the chapters. */
const CASE_RE = /^#\/work\/([\w-]+)\/?$/;
const caseSlug = (hash: string) => CASE_RE.exec(hash)?.[1] ?? null;
const chapterFromHash = (hash: string) =>
  chapters.find((c) => c.id === hash.replace(/^#/, ''))?.id as ChapterId | undefined;

/**
 * Isolates a crashing chapter: the rest of the site keeps working and the
 * chapter's slot keeps its id and height (the error is still logged by React).
 */
class ChapterBoundary extends Component<{ id: ChapterId; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section id={this.props.id} className="chapter" tabIndex={-1} aria-label={`${this.props.id} (failed to load)`} />;
  }
}

/** The scrolling chapters. Mounted only on the main route, so tracking + refresh live here. */
function Chapters() {
  // Children's layout effects (chapter pins) run before this one, so the
  // chapter-tracking triggers below are created after every pin exists.
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    // One tracker reading live positions: pinned chapters live inside pin
    // spacers that are recreated on breakpoint changes, so measure the spacer.
    const hostOf = (id: string) => {
      const el = document.getElementById(id);
      return el?.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
    };
    const track = () => {
      const mid = window.innerHeight * 0.5;
      let current = chapters[0].id;
      for (const c of chapters) {
        const host = hostOf(c.id);
        if (host && host.getBoundingClientRect().top <= mid) current = c.id;
      }
      setActiveChapter(current);
    };
    // refreshPriority present => GSAP re-sorts before every refresh (it reads vars.refreshPriority).
    const tracker = ScrollTrigger.create({ start: 0, end: 'max', refreshPriority: 0, onUpdate: track, onRefresh: track });

    // Pins must be measured in document order, otherwise a pin that sits after another
    // chapter's one-off trigger is computed against the wrong (not yet expanded) layout.
    // Higher refreshPriority refreshes first, so earlier chapters get larger values.
    // Runs on 'refreshInit' (dispatched just before GSAP sorts), so triggers recreated by
    // gsap.matchMedia on a breakpoint change are ordered too.
    const chapterIndex = (st: ScrollTrigger) => {
      const el = (st.pin ?? st.trigger) as Element | undefined;
      const sec = el?.closest?.('main section[id]');
      const i = sec ? chapters.findIndex((c) => c.id === sec.id) : -1;
      return i < 0 ? 0 : i;
    };
    const prioritise = () => {
      for (const st of ScrollTrigger.getAll()) st.vars.refreshPriority = -chapterIndex(st);
    };
    ScrollTrigger.addEventListener('refreshInit', prioritise);
    prioritise();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    // Land on the chapter named in the hash (e.g. returning from a case study).
    const initial = chapterFromHash(location.hash);
    const land = () => initial && scrollToChapter(initial, false);
    if (initial) land();
    else window.scrollTo(0, 0);

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      ScrollTrigger.refresh();
      land();
    });
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    const onHash = () => {
      const id = chapterFromHash(location.hash);
      if (id) scrollToChapter(id);
    };
    window.addEventListener('hashchange', onHash);

    return () => {
      cancelled = true;
      window.removeEventListener('load', onLoad);
      window.removeEventListener('hashchange', onHash);
      ScrollTrigger.removeEventListener('refreshInit', prioritise);
      tracker.kill();
    };
  }, []);

  return (
    <>
      <ExperienceProgress />
      <main>
        <ChapterBoundary id="home"><OpeningSequence /></ChapterBoundary>
        <ChapterBoundary id="about"><ChapterThreshold /></ChapterBoundary>
        <ChapterBoundary id="work"><ChapterGallery /></ChapterBoundary>
        <ChapterBoundary id="process"><ChapterTransformation /></ChapterBoundary>
        <ChapterBoundary id="experience"><ChapterRevelation /></ChapterBoundary>
        <ChapterBoundary id="contact"><FinalTitle /></ChapterBoundary>
      </main>
    </>
  );
}

export default function App() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const onHash = () => setHash(location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const slug = caseSlug(hash);
  useLayoutEffect(() => {
    if (slug) window.scrollTo(0, 0);
  }, [slug]);

  return (
    <>
      <SvgDefs />
      {!slug && (
        <a
          className="skip-link"
          href="#work"
          onClick={(e) => {
            e.preventDefault();
            scrollToChapter('work');
          }}
        >
          Skip to work
        </a>
      )}
      <Navigation />
      {slug ? <CaseStudy slug={slug} /> : <Chapters />}
      <div className="grain" aria-hidden="true" />
      <CustomCursor />
    </>
  );
}
