// Guitar and music-theory constants and helpers. Pure: no DOM, no React.
import type { Finger, FrettingFinger, Key, Spot } from './types.ts';

/** Standard tuning, high e first (tab order). `midi` is the MIDI note of the open string. */
export const TUNING = [
  { label: 'e', midi: 64 },
  { label: 'B', midi: 59 },
  { label: 'G', midi: 55 },
  { label: 'D', midi: 50 },
  { label: 'A', midi: 45 },
  { label: 'E', midi: 40 },
] as const;

export const STRING_COUNT = TUNING.length;
export const FRETS = 15;

export const FINGERS: readonly { key: FrettingFinger; name: string }[] = [
  { key: '1', name: 'Index' },
  { key: '2', name: 'Middle' },
  { key: '3', name: 'Ring' },
  { key: '4', name: 'Pinky' },
  { key: 'T', name: 'Thumb' },
];

/** Finger value stored for an open string. */
export const OPEN = '0' satisfies Finger;

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

export const ROOTS = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'] as const;

export interface Mode {
  name: string;
  short: string;
  /** Semitones above the root. */
  steps: number[];
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MODE_NAMES = ['Ionian (major)', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian (minor)', 'Locrian'];
const at = (xs: readonly number[], i: number): number => xs[i % xs.length] ?? 0;

/** Modes 1-7 are rotations of the major scale; pentatonics follow. */
export const MODES: readonly Mode[] = [
  ...MODE_NAMES.map((short, i) => ({
    name: `${i + 1} · ${short}`,
    short,
    steps: MAJOR.map((_, k) => (at(MAJOR, i + k) - at(MAJOR, i) + 12) % 12),
  })),
  { name: 'Major pentatonic', short: 'major pentatonic', steps: [0, 2, 4, 7, 9] },
  { name: 'Minor pentatonic', short: 'minor pentatonic', steps: [0, 3, 5, 7, 10] },
];

export function openMidi(string: number): number {
  const t = TUNING[string];
  if (!t) throw new RangeError(`No string ${string}`);
  return t.midi;
}

export const midiAt = (string: number, fret: number): number => openMidi(string) + fret;
export const midiOf = (spot: Spot): number => midiAt(spot.s, spot.f);
export const stringLabel = (string: number): string => TUNING[string]?.label ?? '?';

export function noteName(string: number, fret: number): string {
  const m = midiAt(string, fret);
  return `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
}

/** Every (string, fret) that sounds MIDI note `m` within the playable range. */
export const spotsFor = (m: number): Spot[] =>
  TUNING.map((t, s) => ({ s, f: m - t.midi })).filter((p) => p.f >= 0 && p.f <= FRETS);

export type Scale = ReadonlySet<number>;

/**
 * Pitch class of the major scale a key's notes come from (its CAGED shapes are that scale's shapes):
 * a mode's parent major, the root for major pentatonic, a minor third up for minor pentatonic.
 */
export function parentMajorRoot(key: Key): number {
  const offset = key.mode < MAJOR.length ? at(MAJOR, key.mode) : key.mode === MAJOR.length + 1 ? -3 : 0;
  return (((key.root - offset) % 12) + 12) % 12;
}

/** Pitch classes in a key, or null when no key is set. */
export function scaleOf(key: Key | null): Scale | null {
  const mode = key ? MODES[key.mode] : undefined;
  if (!key || !mode) return null;
  return new Set(mode.steps.map((step) => (step + key.root) % 12));
}

export const keyName = (key: Key | null): string => {
  const mode = key ? MODES[key.mode] : undefined;
  return key && mode ? `${ROOTS[key.root]?.split('/')[0]} ${mode.short}` : '';
};
