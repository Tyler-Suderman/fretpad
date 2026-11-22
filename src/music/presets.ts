// Ready-made practice sheets. Pure: each call builds a fresh sheet with new column ids.
import fourChordRun from './fixtures/nate-noodle-a.json';
import { fingerFor } from './fingering.ts';
import { newSheet, noteEvent } from './tab.ts';
import { MODES, spotsFor } from './theory.ts';
import type { Finger, Key, Note, Sheet } from './types.ts';

/** MIDI note of scale degree `d` (1 is the root at `rootMidi`; 8 is the octave in a 7-note scale). */
export function degreeMidi(rootMidi: number, steps: readonly number[], d: number): number {
  const i = d - 1;
  const n = steps.length;
  return rootMidi + 12 * Math.floor(i / n) + (steps[((i % n) + n) % n] ?? 0);
}

/**
 * Place pitches in one hand position, finger 1 on fret `pos` and one finger per fret.
 * A pitch outside the 4-fret box may use a one-fret stretch either side.
 */
export function inPosition(midis: readonly number[], pos: number): Note[] {
  return midis.map((m) => {
    const spots = spotsFor(m);
    const spot =
      spots.find((p) => p.f >= pos && p.f <= pos + 3) ?? spots.find((p) => p.f >= pos - 1 && p.f <= pos + 4);
    if (!spot) throw new RangeError(`MIDI ${m} is out of reach of position ${pos}`);
    return { ...spot, finger: fingerFor(spot.f, pos) };
  });
}

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let d = from; from <= to ? d <= to : d >= to; d += from <= to ? 1 : -1) out.push(d);
  return out;
};

interface PresetSpec {
  title: string;
  key: Key;
  /** MIDI of the low root. */
  root: number;
  /** Finger 1's fret. */
  pos: number;
  degrees: number[];
}

const C_MAJOR: Key = { root: 0, mode: 0 };
const A_MINOR_PENTATONIC: Key = { root: 9, mode: 8 };
const C3 = 48; // low E string, fret 8
const A2 = 45; // low E string, fret 5

/** 1 3 5 7 8 7 5 3 from each degree up to the octave, then the scale back down to the root. */
const climbingSevenths = (): number[] => [
  ...range(1, 8).flatMap((d) => [d, d + 2, d + 4, d + 6, d + 7, d + 6, d + 4, d + 2]),
  ...range(9, 1),
];

const SPECS = {
  'c-major': {
    title: 'C major scale',
    key: C_MAJOR,
    root: C3,
    pos: 7,
    degrees: [...range(1, 15), ...range(14, 1)],
  },
  'a-minor-pentatonic': {
    title: 'A minor pentatonic',
    key: A_MINOR_PENTATONIC,
    root: A2,
    pos: 5,
    degrees: [...range(1, 11), ...range(10, 1)],
  },
  'c-major-sevenths': {
    title: 'C major 1-3-5-7 climb',
    key: C_MAJOR,
    root: C3,
    pos: 7,
    degrees: climbingSevenths(),
  },
} satisfies Record<string, PresetSpec>;

/** Sheets written out note by note (from a lesson), copied as they are. */
const WRITTEN = {
  'a-major-four-chords': {
    title: 'A major I-ii-vi-IV arpeggios',
    sheet: fourChordRun,
  },
};

export type PresetId = keyof typeof SPECS | keyof typeof WRITTEN;

/** Presets in menu order. */
export const PRESETS: readonly { id: PresetId; title: string }[] = [
  ...(Object.keys(SPECS) as (keyof typeof SPECS)[]).map((id) => ({ id, title: SPECS[id].title })),
  ...(Object.keys(WRITTEN) as (keyof typeof WRITTEN)[]).map((id) => ({ id, title: WRITTEN[id].title })),
];

function writtenSheet(id: keyof typeof WRITTEN): Sheet {
  const { title, sheet } = WRITTEN[id];
  const events = sheet.events.flatMap((e) => e.notes.slice(0, 1)).map((n) => noteEvent(n.s, n.f, n.finger as Finger));
  return {
    ...newSheet(title),
    events,
    cursor: events.length - 1,
    bpm: sheet.bpm,
    div: 8,
    key: sheet.key,
    system: 'caged',
  };
}

export function presetSheet(id: PresetId): Sheet {
  if (id in WRITTEN) return writtenSheet(id as keyof typeof WRITTEN);
  const { title, key, root, pos, degrees } = SPECS[id as keyof typeof SPECS];
  const steps = MODES[key.mode]?.steps ?? [];
  const notes = inPosition(
    degrees.map((d) => degreeMidi(root, steps, d)),
    pos,
  );
  const events = notes.map((n) => noteEvent(n.s, n.f, n.finger));
  return { ...newSheet(title), events, cursor: events.length - 1, bpm: 80, div: 8, key, system: 'caged' };
}
