// Fingering rules: a "one finger per fret" hand, CAGED positions and finger suggestions. Pure functions over notes.
import { FRETS, OPEN, midiAt, parentMajorRoot } from './theory.ts';
import type { Finger, FingeringSystem, Key, Note, Spot } from './types.ts';

/** Lowest fret finger 1 can sit on so the 4-fret box stays on the neck. */
const clampPos = (pos: number): number => Math.max(1, Math.min(FRETS - 3, pos));

const inBox = (fret: number, pos: number): boolean => fret >= pos && fret <= pos + 3;

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

/**
 * Index-finger fret of each CAGED major-scale shape, relative to the parent major root on the low E string:
 * E shape (root under finger 2), then D, C, A and G shapes up the neck. In G major: frets 2, 4, 7, 9, 12.
 */
const CAGED_OFFSETS = [-1, 1, 4, 6, 9];

/** Hand positions (finger 1's fret) of the key's five CAGED shapes, in every octave that fits on the neck. */
export function cagedPositions(key: Key): number[] {
  const rootOnLowE = (parentMajorRoot(key) - midiAt(5, 0) + 120) % 12;
  const out = new Set<number>();
  for (const base of [rootOnLowE - 12, rootOnLowE, rootOnLowE + 12]) {
    for (const o of CAGED_OFFSETS) {
      const p = base + o;
      if (p >= 0 && p <= FRETS - 3) out.add(Math.max(1, p)); // a shape at fret 0 is open position: finger 1 on fret 1
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** A fret the hand at `pos` reaches: the 4-fret box plus a one-fret stretch either side. */
const reaches = (fret: number, pos: number): boolean => fret >= pos - 1 && fret <= pos + 4;

/**
 * The box rule on its own: the finger a fixed hand position gives the fret.
 * caged (with a key): the shape that reaches the fret, preferring no stretch, then the one nearest the recent hand.
 * perFret, or caged without a key: keep the recent hand if it reaches the fret, else move it the least.
 */
export function boxFinger(fret: number, recent: readonly Note[], key: Key | null, system: FingeringSystem): Finger {
  if (fret === 0) return OPEN;
  const fretted = recent.filter((n) => n.f > 0);
  const hand = fretted.length ? inferPos(fretted) : null;

  if (system === 'caged' && key) {
    const ref = hand ?? fret - 1; // no context: the shape that puts the fret under finger 2
    const fits = cagedPositions(key).filter((p) => reaches(fret, p));
    const cost = (p: number) => (inBox(fret, p) ? 0 : 10) + Math.abs(p - ref);
    const best = fits.reduce<number | null>((b, p) => (b === null || cost(p) < cost(b) ? p : b), null);
    if (best !== null) return fingerFor(fret, best);
  }

  if (hand !== null && reaches(fret, hand)) return fingerFor(fret, hand);
  if (hand !== null && fret > hand + 4) return fingerFor(fret, clampPos(fret - 3)); // reach up: pinky
  return fingerFor(fret, clampPos(fret)); // first note, or reaching down: index
}

const FRETTING: readonly Finger[] = ['1', '2', '3', '4'];

/**
 * Hand-model weights, checked against a real played sheet (src/music/fixtures/nate-noodle.json) but chosen as
 * round, sensible values rather than fitted to it.
 */
const HAND = {
  /** How much each earlier note counts, most recent first. */
  recency: [1, 0.5, 0.3, 0.2],
  /** Same finger, same fret, next string: rolling across. */
  roll: 0.5,
  /** Same finger elsewhere: the finger has to lift and move (plus a little per fret). */
  move: 1.5,
  movePerFret: 0.3,
  /** Two fingers on the same fret. */
  sameFret: 1.5,
  /** Each fret two fingers sit off their natural one-fret-apart spacing, up to one fret (a normal stretch)... */
  stretch: 0.75,
  /** ...and beyond that. */
  farStretch: 2,
  /** A higher finger on a lower fret than a lower finger. */
  cross: 8,
  /** Using a finger the system's box rule wouldn't. */
  offPattern: 0.75,
};

/** How awkward finger k on (s, f) is right after finger rk on (rs, rf). */
function transitionCost(k: number, s: number, f: number, rk: number, rs: number, rf: number): number {
  if (rk === k) {
    if (rf === f && rs === s) return 0;
    if (rf === f && Math.abs(rs - s) === 1) return HAND.roll;
    return HAND.move + HAND.movePerFret * Math.abs(rf - f);
  }
  const gap = k > rk ? f - rf : rf - f; // frets from the lower finger up to the higher one
  if (gap < 0) return HAND.cross;
  if (gap === 0) return HAND.sameFret;
  const off = Math.abs(gap - Math.abs(k - rk));
  return off <= 1 ? HAND.stretch * off : HAND.stretch + HAND.farStretch * (off - 1);
}

/** Fingers the box rule allows for the fret: any CAGED shape that reaches it (with a key), else the box finger. */
function patternFingers(fret: number, recent: readonly Note[], key: Key | null, system: FingeringSystem): Set<Finger> {
  if (system === 'caged' && key) {
    const shapes = cagedPositions(key).filter((p) => reaches(fret, p));
    if (shapes.length) return new Set(shapes.map((p) => fingerFor(fret, p)));
  }
  return new Set([boxFinger(fret, recent, key, system)]);
}

/**
 * Suggest a finger for a note, given the notes just before it (most recent first).
 * Follows the hand: each finger is scored by how it sits against the recent fingers (one fret apart, rolls,
 * stretches, shifts), with the system's box rule as a light preference. No fretted context: the box rule.
 */
export function suggestFinger(
  { s, f }: Pick<Spot, 's' | 'f'>,
  recent: readonly Note[],
  key: Key | null,
  system: FingeringSystem,
): Finger {
  if (f === 0) return OPEN;
  const context = recent.slice(0, HAND.recency.length);
  const fingered = context.some((n) => n.f > 0 && FRETTING.includes(n.finger));
  if (!fingered) return boxFinger(f, recent, key, system);
  const pattern = patternFingers(f, recent, key, system);
  let best: Finger = '1';
  let bestCost = Infinity;
  for (const finger of FRETTING) {
    const k = Number(finger);
    let cost = pattern.has(finger) ? 0 : HAND.offPattern;
    context.forEach((r, j) => {
      if (r.f > 0 && FRETTING.includes(r.finger)) cost += HAND.recency[j]! * transitionCost(k, s, f, Number(r.finger), r.s, r.f);
    });
    if (cost < bestCost - 1e-9) {
      bestCost = cost;
      best = finger;
    }
  }
  return best;
}
