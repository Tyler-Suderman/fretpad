// The tab document model: sheets made of columns (see types.ts).
import { OPEN } from './theory.ts';
import type { BarColumn, Column, Finger, Note, NotesColumn, RestColumn, Sheet } from './types.ts';

export const uid = (): string => Math.random().toString(36).slice(2, 9);

export const noteEvent = (s: number, f: number, finger: Finger): NotesColumn => ({
  id: uid(),
  kind: 'notes',
  notes: [{ s, f, finger: f === 0 ? OPEN : finger }],
});
export const restEvent = (): RestColumn => ({ id: uid(), kind: 'rest' });
export const barEvent = (): BarColumn => ({ id: uid(), kind: 'bar' });

export const isNotes = (ev: Column | undefined): ev is NotesColumn => ev?.kind === 'notes';
/** Columns a fret tap can replace in place. */
export const isReplaceable = (ev: Column | undefined): ev is NotesColumn | RestColumn =>
  ev?.kind === 'notes' || ev?.kind === 'rest';
export const hasNotes = (events: readonly Column[]): boolean => events.some(isNotes);
/** First note of a column (single-note editing; chords will extend this). */
export const leadNote = (ev: Column | undefined): Note | null => (isNotes(ev) ? ev.notes[0] : null);

export const newSheet = (title = 'Untitled practice'): Sheet => ({
  id: uid(),
  title,
  events: [],
  cursor: -1,
  bpm: 80,
  div: 8,
  key: null,
});

export interface SectionRange {
  a: number;
  b: number;
  /** The edge was never set, so it follows the sheet's start or end. */
  openStart: boolean;
  openEnd: boolean;
}

/** The loop section as column indices (inclusive), or null if unset, empty, or a set edge's column was deleted. */
export function sectionRange(sheet: Sheet): SectionRange | null {
  const { section, events } = sheet;
  if (!section || !events.length || (section.from === null && section.to === null)) return null;
  const a = section.from === null ? 0 : events.findIndex((e) => e.id === section.from);
  const b = section.to === null ? events.length - 1 : events.findIndex((e) => e.id === section.to);
  if (a < 0 || b < a) return null;
  return { a, b, openStart: section.from === null, openEnd: section.to === null };
}

