// Single source of truth for personal content. Every chapter imports from here.
// All facts come from Resume.pdf; nothing here is invented. No phone number on purpose.
import type { ChapterId } from './chapters';

export interface Stat {
  value: string;
  label: string;
}

export interface Person {
  name: string;
  role: string;
  pitch: string;
  bio: string[];
  location: string;
  email: string;
  github: string;
  linkedin: string;
  resumeUrl: string;
  availability: string;
  motto: string;
  /** Path to a portrait image under /public, or null until one is added. */
  portrait: string | null;
  stats: Stat[];
}

export type ProjectArt = 'shield' | 'pipeline' | 'route';

export interface ArchitectureItem {
  component: string;
  responsibility: string;
}

export interface CaseStudyContent {
  overview: string;
  problem: string;
  approach: string[];
  architecture: ArchitectureItem[];
  outcome: string;
}

export interface Project {
  slug: string;
  title: string;
  kicker: string;
  period: string;
  role: string;
  stack: string[];
  summary: string;
  result: string;
  highlights: string[];
  links: { code: string };
  art: ProjectArt;
  /** Short stage names engraved on the illustration (pipeline art). */
  stages?: string[];
  caseStudy: CaseStudyContent;
}

export interface ExperienceEntry {
  org: string;
  role: string;
  period: string;
  location: string;
  /** True when the role is ongoing. */
  current: boolean;
  summary: string;
  bullets: string[];
  /** Condensed wording of `bullets` (same facts, shorter lines) for the timeline cards. */
  short?: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  score: string;
  period: string;
  location: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
}

export interface Achievement {
  title: string;
  event: string;
  date: string;
}

export interface SkillGroup {
  group: string;
  items: string[];
}

export interface ProcessStep {
  step: string;
  title: string;
  text: string;
}

const github = 'https://github.com/Prabhav558';

export const person: Person = {
  name: 'Prabhav Singh',
  role: 'Backend & Agentic-AI Engineer',
  pitch: 'I build backends that reason, and agents that can be trusted.',
  bio: [
    'I am a Computer Science student at SRM Institute of Science and Technology, graduating in 2027, and I work on the backend side of AI systems: orchestration graphs, async pipelines, and the access layers that keep them safe to run.',
    'My interest is in reliability. I like putting deterministic logic where it belongs, letting models narrate rather than decide, and checking their output against evidence before anything is stored or shown.',
    'Recently that has meant a multi-agent company-intelligence engine at TalenciaGlobal, a self-hosted security platform at Xenkrypt Technologies, and a local AI ops agent I am building on my own.',
  ],
  location: 'Chennai, India',
  email: 'ps9681@srmist.edu.in',
  github,
  linkedin: 'https://www.linkedin.com/in/prabhav-singh-7a4285208',
  resumeUrl: `${import.meta.env.BASE_URL}Prabhav-Singh-Resume.pdf`,
  availability: 'Open to internships and full-time roles from 2027',
  motto: 'FACTA NON VERBA',
  portrait: null,
  stats: [
    { value: '9.35', label: 'CGPA, B.Tech CSE' },
    { value: '3', label: 'AWS certifications' },
    { value: '2', label: 'industry roles' },
  ],
};

export const projects: Project[] = [
  {
    slug: 'sentrix',
    title: 'Sentrix',
    kicker: 'Self-hosted SOC platform',
    period: 'Jan 2026 – Mar 2026',
    role: 'Core contributor: IAM and Perimeter Security modules',
    stack: ['FastAPI', 'Python 3.12', 'Go', 'Next.js', 'PostgreSQL', 'Elasticsearch', 'Redis', 'Keycloak'],
    summary:
      'A team-built, open-source security operations platform that brings SIEM, endpoint, network, IAM, cloud posture, AppSec, SOAR and GRC together behind a single API.',
    result: 'About ten modules on one modular-monolith backend, with RBAC enforced on every request.',
    highlights: [
      'Modular monolith: each module owns an isolated PostgreSQL schema, router and service layer.',
      'IAM module: Keycloak-managed identity behind a Casbin RBAC layer, enforced across all modules.',
      'Perimeter Security module: firewall rules, asset inventory, MITRE ATT&CK mapping and a live alert timeline, plus its executor in the Go endpoint agent.',
      'Compliance model that derives ISO 27001 control evidence from live telemetry and scan findings.',
    ],
    links: { code: github },
    art: 'shield',
    caseStudy: {
      overview:
        'Sentrix is a self-hosted SOC platform of roughly ten modules, built by a team and released as open source. I was a core contributor, and built the IAM feature set and the Perimeter Security module. At Xenkrypt I also owned the GRC module.',
      problem:
        'Security teams stitch together separate tools for logs, endpoints, identities and compliance, and the compliance evidence ends up in manual uploads that drift away from what is actually happening on the hosts.',
      approach: [
        'Architect the backend as a modular monolith so each module is isolated by schema, router and service layer, yet shares one API surface.',
        'Put identity in Keycloak and permissions in a Casbin RBAC layer that is evaluated on every request, so access policy has one home.',
        'Use asyncpg on the hot path and ARQ/Redis background workers for long-running scans and backups.',
        'Derive ISO 27001 control evidence from live telemetry and scan findings instead of manual uploads.',
      ],
      architecture: [
        { component: 'FastAPI backend', responsibility: 'Single API for all modules; per-module router and service layer.' },
        { component: 'PostgreSQL', responsibility: 'One isolated schema per module; asyncpg on the hot path.' },
        { component: 'ARQ and Redis workers', responsibility: 'Background execution of long-running scans and backups.' },
        { component: 'Keycloak and Casbin', responsibility: 'Managed identities plus RBAC policy evaluation across all modules.' },
        { component: 'Go endpoint agent', responsibility: 'Executors that enforce perimeter rules on managed hosts.' },
        { component: 'grc-risk-engine', responsibility: 'Risk scoring, scenarios, asset register and attestation workflow.' },
      ],
      outcome:
        'A working platform that unifies about ten security disciplines behind one backend, with access control enforced consistently and compliance evidence that tracks live data.',
    },
  },
  {
    slug: 'systemlens',
    title: 'SystemLens',
    kicker: 'Local AI ops agent',
    period: 'Aug 2026 – Present',
    role: 'Builder',
    stack: ['Python', 'asyncio', 'Docker SDK', 'SQLite', 'Ollama', 'Groq'],
    summary:
      'A locally-run agent that watches Docker Compose logs in real time and produces root-cause findings grounded in evidence.',
    result: 'The model ranks and explains; deterministic rules do the causal inference.',
    highlights: [
      '6-stage async pipeline: watch, parse, cluster, correlate, rate-limit, analyze.',
      'Concurrent projects on one asyncio loop, with blocking Docker and filesystem I/O offloaded to threads.',
      '6-rule correlation engine handles all causal inference; the LLM only ranks and explains candidates under a strict JSON schema.',
      'Evidence-sanitization layer checks every quoted string against what the model was shown and downgrades verdicts on fabrication.',
    ],
    links: { code: github },
    art: 'pipeline',
    stages: ['WATCH', 'PARSE', 'CLUSTER', 'CORRELATE', 'RATE-LIMIT', 'ANALYZE'],
    caseStudy: {
      overview:
        'SystemLens is a local AI agent that watches the logs of several Docker Compose projects at once and reports root causes with the evidence behind them. It is a personal project, in progress since August 2026.',
      problem:
        'Language models are fluent at explaining failures and equally fluent at inventing them. For log analysis, a confident but fabricated cause is worse than no answer.',
      approach: [
        'Split reasoning from narration: a deterministic correlation engine produces the candidate causes.',
        'Give the LLM only the supplied candidates and a strict JSON schema, so it can rank and explain but not originate.',
        'Verify afterwards: every string the model quotes is checked against the evidence it was actually shown.',
        'Downgrade the verdict automatically when a quote cannot be found.',
      ],
      architecture: [
        { component: 'Watch and parse', responsibility: 'Stream container logs for multiple Compose projects on one asyncio loop.' },
        {
          component: 'Cluster and correlate',
          responsibility:
            'Group events, then apply six rules: connection-target resolution, recent-exit and OOM detection, health-check failures, dependency-chain walking, prior-resolution memory.',
        },
        { component: 'Rate-limit', responsibility: 'Keep analysis calls bounded.' },
        { component: 'Analyze (Ollama or Groq)', responsibility: 'Rank and explain supplied candidates under a strict JSON schema.' },
        { component: 'Evidence sanitizer', responsibility: 'Verify quoted strings against shown evidence and downgrade fabricated verdicts.' },
        { component: 'SQLite', responsibility: 'Local store, including memory of prior resolutions.' },
      ],
      outcome:
        'An agent whose conclusions can be traced to log evidence, which closes the main hallucination route for this kind of tool.',
    },
  },
  {
    slug: 'safepath',
    title: 'SafePath',
    kicker: 'AI safety companion',
    period: 'Dec 2024 – Jan 2025',
    role: 'Mobile app developer',
    stack: ['Flutter', 'Dart', 'Python'],
    summary:
      'A cross-platform mobile app that scores route safety against local crime-incident data and recommends a lower-risk path.',
    result: 'Safer routes, one-tap SOS, and anonymous reporting without an account.',
    highlights: [
      'Weights candidate routes by the proximity of reported incidents.',
      'One-tap and voice-activated SOS that alerts a pre-set list of emergency contacts.',
      'Anonymous, unauthenticated incident reporting so users can flag unsafe places without signing up.',
    ],
    links: { code: github },
    art: 'route',
    caseStudy: {
      overview:
        'SafePath is a Flutter mobile app that helps people choose a safer way to travel, and gives them a fast way to ask for help.',
      problem:
        'The shortest route is not always the safest one, and in an unsafe moment there is no time to navigate menus or create an account.',
      approach: [
        'Score each candidate route against local crime-incident data, weighting by how close reported incidents are to the path.',
        'Recommend the lower-risk route rather than only the fastest.',
        'Make SOS immediate: one tap or a voice command notifies pre-set emergency contacts.',
        'Keep reporting frictionless by allowing anonymous incident reports with no account.',
      ],
      architecture: [
        { component: 'Flutter app (Dart)', responsibility: 'Cross-platform interface for routing, SOS and reporting.' },
        { component: 'Python scoring', responsibility: 'Route safety scoring from incident proximity.' },
        { component: 'SOS module', responsibility: 'One-tap and voice-activated alerts to emergency contacts.' },
        { component: 'Incident reporting', responsibility: 'Anonymous, unauthenticated reports of unsafe locations.' },
      ],
      outcome:
        'A cross-platform app that turns incident data into a route recommendation and puts emergency alerting one action away.',
    },
  },
];

export const experience: ExperienceEntry[] = [
  {
    org: 'TalenciaGlobal',
    role: 'Software Development Intern',
    period: 'Jul 2026 – Present',
    location: 'Chennai, India',
    current: true,
    summary: 'Backend and agent architecture for a company-intelligence platform.',
    bullets: [
      'Architected the core agentic company-intelligence engine: a LangGraph graph that fans one research request out to 9 parallel domain-specialist agents, grounded through an AgentCore web-search gateway and AWS Bedrock, to populate a 164-field company schema.',
      'Designed a 3-model judge-consensus layer that re-evaluates low-confidence fields across independent Bedrock calls before persisting to PostgreSQL, as a check against single-model hallucination.',
      'Built the backend end to end: async job queueing, RBAC policy and middleware on every request, and notification and email services, exposed via FastAPI to a Next.js dashboard.',
      'Merged the Sales Executive, Company ATS and College Admin workspaces onto the shared Researcher backend, so all four roles authenticate through one RBAC-enforced deployment.',
    ],
    short: [
      'LangGraph engine fanning one request out to 9 parallel specialist agents, grounded via AgentCore and Bedrock, filling a 164-field schema.',
      '3-model judge consensus re-checks low-confidence fields across independent Bedrock calls before they reach PostgreSQL.',
      'Backend end to end: async job queues, RBAC on every request, notification and email services, FastAPI serving a Next.js dashboard.',
      'Merged four workspaces onto one Researcher backend, so all four roles authenticate through a single RBAC-enforced deployment.',
    ],
  },
  {
    org: 'Xenkrypt Technologies',
    role: 'Backend Developer',
    period: 'Dec 2025 – Mar 2026',
    location: 'Chennai, India',
    current: false,
    summary: 'Core contributor to the Sentrix SOC platform.',
    bullets: [
      'Core contributor to Sentrix, a self-hosted SOC platform unifying 10 security disciplines behind a single FastAPI backend and a Go endpoint agent.',
      'Owned the GRC module and a standalone grc-risk-engine microservice (risk scoring, scenarios, asset register, attestation), deriving ISO 27001 compliance from live scan findings and telemetry.',
      'Built the Perimeter Security module (firewall rules, asset inventory, MITRE ATT&CK mapping, alert timeline) with its executor in the Go agent.',
      'Delivered the initial IAM feature set: Keycloak identities behind a Casbin RBAC layer enforced across all 10 modules.',
    ],
    short: [
      'Core contributor to Sentrix: a self-hosted SOC platform unifying 10 security disciplines behind one FastAPI backend and a Go endpoint agent.',
      'Owned the GRC module and the grc-risk-engine microservice, deriving ISO 27001 compliance from live scan findings and telemetry.',
      'Built Perimeter Security: firewall rules, asset inventory, MITRE ATT&CK mapping and alert timeline, with its executor in the Go agent.',
      'Delivered the initial IAM feature set: Keycloak identities behind Casbin RBAC, enforced across all 10 modules.',
    ],
  },
];

export const education: EducationEntry[] = [
  {
    school: 'SRM Institute of Science and Technology, Kattankulathur',
    degree: 'B.Tech, Computer Science and Engineering',
    score: 'CGPA 9.35/10',
    period: 'Expected 2027',
    location: 'Chennai, TN',
  },
  {
    school: 'City Montessori School',
    degree: 'Class XII, CISCE (PCM)',
    score: '91.25%',
    period: '2023',
    location: 'Lucknow, UP',
  },
  {
    school: 'City Montessori School',
    degree: 'Class X, CISCE',
    score: '95.8%',
    period: '2021',
    location: 'Lucknow, UP',
  },
];

export const certifications: Certification[] = [
  { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified AI Practitioner', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' },
  { name: 'AI Engineer Agentic Track: The Complete Agent & MCP Course', issuer: 'Udemy' },
];

export const achievements: Achievement[] = [
  { title: 'Honorable Mention', event: 'MozoHack (SRMKZILLA)', date: 'Apr 2025' },
  { title: 'Special Mention', event: 'DAYZERO (CodeNex)', date: 'Apr 2025' },
];

export const skills: SkillGroup[] = [
  {
    group: 'Agentic AI & LLM',
    items: ['LangChain', 'LangGraph', 'MCP (Model Context Protocol)', 'Multi-Agent Orchestration', 'RAG', 'Prompt Engineering', 'LLM Evaluation'],
  },
  { group: 'Languages', items: ['Python', 'Java', 'C++', 'C', 'Rust'] },
  { group: 'APIs', items: ['FastAPI', 'REST APIs', 'WebSockets'] },
  { group: 'Frontend & Mobile', items: ['React', 'Next.js', 'Flutter', 'Tailwind CSS'] },
  { group: 'Cloud & DevOps', items: ['Docker', 'Kubernetes', 'Nginx', 'Linux', 'Git', 'CI/CD'] },
];

export const spokenLanguages: string[] = ['English (Professional Working Proficiency)', 'Hindi (Native)'];

// Named processSteps (not `process`) to avoid shadowing the global.
export const processSteps: ProcessStep[] = [
  {
    step: '01',
    title: 'Discover',
    text: 'I start by finding what must stay true: which decisions need to be deterministic, and which can be left to a model.',
  },
  {
    step: '02',
    title: 'Design',
    text: 'I give each module its own boundaries, put access control in one layer that runs on every request, and keep long work off the request path.',
  },
  {
    step: '03',
    title: 'Build',
    text: 'I wire agents and services together so that reasoning is explicit, and add reliability checks such as consensus judges before anything is stored.',
  },
  {
    step: '04',
    title: 'Ship',
    text: 'I verify model output against its evidence, run it behind async queues and RBAC, and release it as something a team can depend on.',
  },
];

export const sectionLines: Record<ChapterId, string> = {
  home: 'Somewhere past midnight, the systems keep thinking.',
  about: 'Behind every quiet interface, a gate that must be kept.',
  work: 'Three rooms, each built to hold its weight.',
  process: 'First the question, then the proof.',
  experience: 'A short road, walked with attention.',
  contact: 'The lamp stays lit. Come in.',
};

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
