// Fingering rules for a "one finger per fret" hand. Pure functions over notes.
import { FRETS, OPEN, STRING_COUNT, midiAt, midiOf, spotsFor } from './theory.ts';
import type { Scale } from './theory.ts';
import type { Alternative, Finger, Note, Spot } from './types.ts';

/** Lowest fret finger 1 can sit on so the 4-fret box stays on the neck. */
export const clampPos = (pos: number): number => Math.max(1, Math.min(FRETS - 3, pos));

export const inBox = (fret: number, pos: number): boolean => fret >= pos && fret <= pos + 3;

/** Finger for a fret with the hand at `pos` (finger 1 on fret `pos`). Outside the box clamps to 1 or 4. */
export function fingerFor(fret: number, pos: number): Finger {
  if (fret === 0) return OPEN;
  if (fret < pos) return '1';
  if (fret > pos + 3) return '4';
  return String(fret - pos + 1) as Finger;
}

/**
 * Guess the hand position from fingers already written (fret - finger + 1, majority vote),
 * falling back to the lowest fretted note.
 */
export function inferPos(notes: readonly Note[]): number {
  const votes = new Map<number, number>();
  let lowest = Infinity;
  for (const n of notes) {
    if (n.f <= 0) continue;
    lowest = Math.min(lowest, n.f);
    const k = Number(n.finger);
    if (k >= 1 && k <= 4) {
      const p = n.f - k + 1;
      votes.set(p, (votes.get(p) ?? 0) + 1);
    }
  }
  let best: { p: number; count: number } | null = null;
  for (const [p, count] of votes) if (!best || count > best.count) best = { p, count };
  return clampPos(best ? best.p : Number.isFinite(lowest) ? lowest : 1);
}

/** Cost of playing a spot with the hand at `pos`: in the box, then a 1-fret stretch, then open, then far. */
function spotCost(p: Spot, pos: number, refString: number): number {
  let c: number;
  if (p.f === 0) c = 1.5;
  else if (inBox(p.f, pos)) c = 0;
  else if (p.f === pos - 1 || p.f === pos + 4) c = 2;
  else c = 10 + Math.min(Math.abs(p.f - pos), Math.abs(p.f - pos - 3));
  return c + 0.15 * Math.abs(p.s - refString); // avoid jumping strings
}

/**
 * Move each note to where its pitch sits under a hand at `pos` and assign fingers.
 * Pitches never change. Returns new notes in the same order.
 */
export function fitRun(notes: readonly Note[], pos: number): Note[] {
  const hand = clampPos(pos);
  let prevString: number | null = null;
  return notes.map((n) => {
    const ref: number = prevString ?? n.s;
    let best: Spot | null = null;
    let bestCost = Infinity;
    for (const p of spotsFor(midiOf(n))) {
      const c = spotCost(p, hand, ref);
      if (c < bestCost) {
        bestCost = c;
        best = p;
      }
    }
    const moved: Note = best ? { ...best, finger: fingerFor(best.f, hand) } : n;
    prevString = moved.s;
    return moved;
  });
}

/** How many scale tones a 4-fret box at `pos` holds across all strings. */
function scaleTonesInBox(scale: Scale, pos: number): number {
  let tones = 0;
  for (let s = 0; s < STRING_COUNT; s++) for (let f = pos; f <= pos + 3; f++) if (scale.has(midiAt(s, f) % 12)) tones++;
  return tones;
}

/**
 * Alternative places to play `note` (same pitch, other strings), each with the hand position that
 * holds it plus the most neighbouring notes, and the finger to use there. The best one is flagged.
 * `currentPos` breaks ties toward staying put; `scale` slightly favours boxes rich in the key.
 */
export function alternativesFor(
  note: Note,
  neighbours: readonly Note[],
  currentPos: number,
  scale: Scale | null,
): Alternative[] {
  const options: Alternative[] = spotsFor(midiOf(note))
    .filter((p) => !(p.s === note.s && p.f === note.f))
    .map((p) => {
      let best = { pos: clampPos(p.f), score: -Infinity, fit: 0 };
      for (let pos = clampPos(p.f - 3); pos <= clampPos(Math.max(1, p.f)); pos++) {
        const fit = neighbours.filter((n) => spotsFor(midiOf(n)).some((q) => inBox(q.f, pos))).length;
        const tones = scale ? scaleTonesInBox(scale, pos) : 0;
        const score = fit * 10 + tones * 0.1 - Math.abs(pos - currentPos) * 0.05;
        if (score > best.score) best = { pos, score, fit };
      }
      return { ...p, ...best, finger: p.f === 0 ? OPEN : fingerFor(p.f, best.pos), best: false };
    });
  const top = options.reduce<Alternative | null>((b, o) => (!b || o.score > b.score ? o : b), null);
  if (top) top.best = true;
  return options;
}
