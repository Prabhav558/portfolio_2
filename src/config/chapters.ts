export type ChapterId = 'home' | 'about' | 'work' | 'process' | 'experience' | 'contact';

export interface Chapter {
  id: ChapterId;
  numeral: string;
  label: string;
  /** Short label for the Index menu / tight spaces (falls back to label). */
  nav?: string;
  /** Scroll length of the pinned sequence, as a multiple of viewport height. */
  pin: { desktop: number; mobile: number };
}

export const chapters: Chapter[] = [
  { id: 'home', numeral: 'I', label: 'Introduction', nav: 'Intro', pin: { desktop: 1.6, mobile: 1.0 } },
  { id: 'about', numeral: 'II', label: 'About', nav: 'About', pin: { desktop: 2.2, mobile: 1.4 } },
  { id: 'work', numeral: 'III', label: 'Selected Work', nav: 'Work', pin: { desktop: 5.0, mobile: 3.2 } },
  { id: 'process', numeral: 'IV', label: 'Process & Skills', nav: 'Process', pin: { desktop: 3.6, mobile: 2.6 } },
  { id: 'experience', numeral: 'V', label: 'Experience', nav: 'Experience', pin: { desktop: 3.0, mobile: 2.0 } },
  { id: 'contact', numeral: 'VI', label: 'Contact', nav: 'Contact', pin: { desktop: 1.6, mobile: 1.0 } },
];

export const chapterById = (id: ChapterId) => chapters.find((c) => c.id === id)!;
