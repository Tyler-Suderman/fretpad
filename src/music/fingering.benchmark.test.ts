// Replays a sheet played by a real guitarist (copied from a lesson) through the suggestion logic, note by note,
// the way it runs while tapping: each note is suggested from the notes before it, with the fingers actually used.
import { expect, it } from 'vitest';
import sheet from './fixtures/nate-noodle.json';
import { suggestFinger } from './fingering.ts';
import type { Key, Note } from './types.ts';

// Not 64: the player fingers some identical spots differently (F♯3 on string 3 fret 4 is finger 3 four times
// and 2 once; C4 at fret 5 is 3 twice and 2 once in the same context). Raise this when the logic improves.
const FLOOR = 52;

it(`suggests the played finger for at least ${FLOOR} of the benchmark's notes`, () => {
  const notes = sheet.events.map((e) => e.notes[0] as Note);
  const misses: string[] = [];
  notes.forEach((n, i) => {
    const recent = notes.slice(Math.max(0, i - 4), i).reverse();
    const got = suggestFinger(n, recent, sheet.key as Key, 'caged');
    if (got !== n.finger) misses.push(`#${i} string ${n.s} fret ${n.f}: played ${n.finger}, suggested ${got}`);
  });
  const hits = notes.length - misses.length;
  expect(hits, misses.join('\n')).toBeGreaterThanOrEqual(FLOOR);
});
