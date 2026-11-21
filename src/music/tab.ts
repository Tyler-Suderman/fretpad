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

export function sampleSheet(): Sheet {
  const events: Column[] = [];
  for (const pair of [[5, 4], [3, 2], [1, 0]]) {
    for (const s of pair) for (let f = 1; f <= 4; f++) events.push(noteEvent(s, f, String(f) as Finger));
    events.push(barEvent());
  }
  return { ...newSheet('Example: 1-2-3-4 chromatic warm-up'), events, cursor: events.length - 1 };
}

/** Indices of note columns from a to b inclusive. */
export function noteIndicesBetween(events: readonly Column[], a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) if (isNotes(events[i])) out.push(i);
  return out;
}

/** Next note column from i in direction d (+1/-1), or -1. */
export function stepToNote(events: readonly Column[], i: number, d: 1 | -1): number {
  let j = i + d;
  while (j >= 0 && j < events.length && !isNotes(events[j])) j += d;
  return j >= 0 && j < events.length ? j : -1;
}

/** Up to `count` note columns either side of i, nearest first. */
export function neighbourNotes(events: readonly Column[], i: number, count = 3): Note[] {
  const out: Note[] = [];
  for (const d of [-1, 1] as const) {
    let j = i;
    for (let c = 0; c < count; c++) {
      j = stepToNote(events, j, d);
      const n = leadNote(events[j]);
      if (!n) break;
      out.push(n);
    }
  }
  return out;
}
