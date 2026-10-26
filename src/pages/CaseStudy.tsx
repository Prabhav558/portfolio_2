import { useEffect, useLayoutEffect, useRef } from 'react';
import { brand } from '../config/brand';
import { getProject, projects, type Project } from '../config/portfolio';
import { gsap, MQ, ScrollTrigger } from '../lib/gsap';
import { rasterReveal } from '../lib/transitions';
import CaseArt from './CaseArt';
import ArchitectureDiagram from './ArchitectureDiagram';
import styles from './CaseStudy.module.css';

interface Props {
  slug: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Sets '<title> — <name>' while mounted, then restores the previous title. */
function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} — ${brand.name}`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

function BackLink({ className }: { className?: string }) {
  return (
    <a className={className ?? styles.back} href="#work" data-cursor="hover">
      <span className={styles.backArrow} aria-hidden="true">←</span>
      Back to work
    </a>
  );
}

/** Section frame: sticky mono label on the left, heading + body on the right. */
function Section({
  id,
  num,
  kind,
  title,
  first,
  children,
}: {
  id: string;
  num: string;
  kind: string;
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${styles.sec} ${first ? styles.secFirst : ''}`} aria-labelledby={id}>
      <div className={styles.secLabel} aria-hidden="true">
        <span className={styles.secNum}>{num}</span>
        <span className={`${styles.mono} ${styles.secKind}`}>{kind}</span>
      </div>
      <div className={styles.secBody}>
        <h2 id={id} className={`display ${styles.h2}`} data-reveal>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Article({ project }: { project: Project }) {
  const rootRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const index = projects.findIndex((p) => p.slug === project.slug);
  const total = projects.length;
  const prev = projects[(index - 1 + total) % total];
  const next = projects[(index + 1) % total];
  const cs = project.caseStudy;

  useDocumentTitle(project.title);

  useLayoutEffect(() => {
    let cancelled = false;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      // Calm mode and reduced motion match neither query: content simply stays put.
      mm.add(`${MQ.desktop}, ${MQ.mobile}`, () => {
        const root = rootRef.current!;
        root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 26 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            },
          );
        });
        root.querySelectorAll<HTMLElement>('[data-boxes]').forEach((el) => {
          gsap.fromTo(
            el.querySelectorAll('[data-box], [data-link]'),
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.07,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 80%', once: true },
            },
          );
        });
        if (plateRef.current) {
          gsap
            .timeline({ scrollTrigger: { trigger: plateRef.current, start: 'top 95%', once: true } })
            .add(rasterReveal(plateRef.current, { duration: 1.2, stripe: 9 }));
        }
      });
    }, rootRef);

    // Web fonts shift line breaks and section heights: re-measure once they land.
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, []);

  return (
    <main id="case-study" ref={rootRef} className={styles.page}>
      <BackLink />

      <header className={styles.hero}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.col}>
          <p className={`${styles.mono} ${styles.kicker}`} data-reveal>
            Case study · {pad(index + 1)}/{pad(total)}
          </p>
          <h1 className={`display ${styles.title}`} data-reveal>
            {project.title}
          </h1>
          <p className={styles.sub} data-reveal>
            {project.kicker}
          </p>
          <p className={styles.summary} data-reveal>
            {project.summary}
          </p>
          <div ref={plateRef} className={`${styles.plate} raster`}>
            <CaseArt art={project.art} label={`Engraved illustration for ${project.title}`} />
          </div>
          <p className={`${styles.mono} ${styles.plateCap}`} aria-hidden="true">
            <span>Plate {pad(index + 1)}</span>
            <span>{project.kicker}</span>
          </p>
        </div>
      </header>

      <div className={styles.meta}>
        <div className={styles.col}>
          <dl className={styles.metaGrid} data-reveal>
            <div className={styles.metaCell}>
              <dt className={styles.mono}>Role</dt>
              <dd>{project.role}</dd>
            </div>
            <div className={styles.metaCell}>
              <dt className={styles.mono}>Period</dt>
              <dd>{project.period}</dd>
            </div>
            <div className={styles.metaCell}>
              <dt className={styles.mono}>Stack</dt>
              <dd>
                <ul className={styles.chips} aria-label="Technologies">
                  {project.stack.map((s) => (
                    <li key={s} className={styles.chip}>
                      {s}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className={styles.metaCell}>
              <dt className={styles.mono}>Links</dt>
              <dd>
                <a
                  className={styles.codeLink}
                  href={project.links.code}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Code for ${project.title} on GitHub (opens in a new tab)`}
                  data-cursor="hover"
                >
                  Code →
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={styles.col}>
        <Section id="cs-overview" num="01" kind="Context" title="Overview" first>
          <p className={`${styles.prose} ${styles.lead}`} data-reveal>
            {cs.overview}
          </p>
        </Section>

        <Section id="cs-problem" num="02" kind="Friction" title="The problem">
          <p className={styles.pull} data-reveal>
            {cs.problem}
          </p>
        </Section>

        <Section id="cs-approach" num="03" kind="Method" title="Approach">
          <ol className={styles.steps}>
            {cs.approach.map((a, i) => (
              <li key={i} className={styles.step} data-reveal>
                <span className={styles.stepNum} aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <p className={styles.stepText}>{a}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="cs-architecture" num="04" kind="Structure" title="Architecture">
          <div className={styles.diagPlate} data-boxes>
            <ArchitectureDiagram items={cs.architecture} />
          </div>
          <ul className={styles.archList}>
            {cs.architecture.map((a, i) => (
              <li key={a.component} className={styles.archItem} data-reveal>
                <span className={styles.archName}>
                  <span aria-hidden="true">{pad(i + 1)}</span>
                  {a.component}
                </span>
                <p className={styles.archResp}>{a.responsibility}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="cs-highlights" num="05" kind="Details" title="Highlights">
          <ul className={styles.hl}>
            {project.highlights.map((h, i) => (
              <li key={i} className={styles.hlItem} data-reveal>
                <span className={`${styles.mono} ${styles.hlTag}`} aria-hidden="true">
                  Note {pad(i + 1)}
                </span>
                <p>{h}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className={styles.outcome}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.col}>
          <Section id="cs-outcome" num="06" kind="Result" title="Outcome">
            <p className={styles.outcomeText} data-reveal>
              {cs.outcome}
            </p>
            <p className={styles.stamp} data-reveal>
              <span className="label">In short</span>
              {project.result}
            </p>
          </Section>
        </div>
      </div>

      <nav className={styles.pager} aria-label="More case studies">
        <a className={styles.pagerLink} href={`#/work/${prev.slug}`} rel="prev" data-cursor="hover">
          <span className={`${styles.mono} ${styles.pagerDir}`}>← Previous · {pad(projects.indexOf(prev) + 1)}</span>
          <span className={styles.pagerTitle}>{prev.title}</span>
          <span className={styles.pagerKick}>{prev.kicker}</span>
        </a>
        <a className={styles.pagerLink} href={`#/work/${next.slug}`} rel="next" data-cursor="hover">
          <span className={`${styles.mono} ${styles.pagerDir}`}>Next · {pad(projects.indexOf(next) + 1)} →</span>
          <span className={styles.pagerTitle}>{next.title}</span>
          <span className={styles.pagerKick}>{next.kicker}</span>
        </a>
      </nav>
    </main>
  );
}

function NotFound() {
  useDocumentTitle('Project not found');
  return (
    <main id="case-study" className={styles.nf}>
      <div className={styles.stripes} aria-hidden="true" />
      <div className={styles.col}>
        <p className={`${styles.mono} ${styles.kicker}`}>Case study · 404</p>
        <h1 className={`display ${styles.nfTitle}`}>Project not found</h1>
        <p className={styles.nfText}>There is no case study at this address. These ones exist:</p>
        <ul className={styles.nfLinks}>
          {projects.map((p) => (
            <li key={p.slug}>
              <a className={styles.nfLink} href={`#/work/${p.slug}`}>
                {p.title}
              </a>
            </li>
          ))}
        </ul>
        <BackLink />
      </div>
    </main>
  );
}

export default function CaseStudy({ slug }: Props) {
  const project = getProject(slug);
  return project ? <Article key={project.slug} project={project} /> : <NotFound />;
}
