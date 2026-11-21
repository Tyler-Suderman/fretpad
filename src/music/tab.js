// The tab document model. A sheet is a list of columns ("events"):
//   { kind: 'notes', notes: [{ s, f, finger }] }   one column; an array so chords fit later
//   { kind: 'rest' }                               one empty beat
//   { kind: 'bar' }                                a bar line, takes no time
import { OPEN } from './theory.js';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const noteEvent = (s, f, finger) => ({ id: uid(), kind: 'notes', notes: [{ s, f, finger: f === 0 ? OPEN : finger }] });
export const restEvent = () => ({ id: uid(), kind: 'rest' });
export const barEvent = () => ({ id: uid(), kind: 'bar' });

export const isNotes = (ev) => ev?.kind === 'notes';
/** Columns a fret tap can replace in place. */
export const isReplaceable = (ev) => ev?.kind === 'notes' || ev?.kind === 'rest';
export const hasNotes = (events) => events.some(isNotes);
/** First note of a column (single-note editing; chords will extend this). */
export const leadNote = (ev) => (isNotes(ev) ? ev.notes[0] : null);

export const newSheet = (title = 'Untitled practice') => ({
  id: uid(),
  title,
  events: [],
  cursor: -1, // index of the selected column; new notes go after it. -1 = before the first column
  bpm: 80,
  div: 8, // each column is an eighth note
  key: null, // { root: 0-11, mode: index into MODES }
});

export function sampleSheet() {
  const events = [];
  for (const pair of [[5, 4], [3, 2], [1, 0]]) {
    for (const s of pair) for (let f = 1; f <= 4; f++) events.push(noteEvent(s, f, String(f)));
    events.push(barEvent());
  }
  return { ...newSheet('Example: 1-2-3-4 chromatic warm-up'), events, cursor: events.length - 1 };
}

/** Indices of note columns from a to b inclusive. */
export const noteIndicesBetween = (events, a, b) => {
  const out = [];
  for (let i = a; i <= b; i++) if (isNotes(events[i])) out.push(i);
  return out;
};

/** Next note column from i in direction d (+1/-1), or -1. */
export const stepToNote = (events, i, d) => {
  let j = i + d;
  while (j >= 0 && j < events.length && !isNotes(events[j])) j += d;
  return j >= 0 && j < events.length ? j : -1;
};

/** Up to `count` note columns either side of i, nearest first. */
export function neighbourNotes(events, i, count = 3) {
  const out = [];
  for (const d of [-1, 1]) {
    let j = i;
    for (let c = 0; c < count; c++) {
      j = stepToNote(events, j, d);
      if (j < 0) break;
      out.push(leadNote(events[j]));
    }
  }
  return out;
}
