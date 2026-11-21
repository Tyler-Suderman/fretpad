import { describe, expect, it } from 'vitest';
import { alternativesFor, fingerFor, fitRun, inferPos } from './fingering.js';
import { midiOf } from './theory.js';

describe('fingerFor', () => {
  it('gives one finger per fret inside the box and clamps outside it', () => {
    expect(fingerFor(5, 5)).toBe('1');
    expect(fingerFor(8, 5)).toBe('4');
    expect(fingerFor(4, 5)).toBe('1');
    expect(fingerFor(10, 5)).toBe('4');
    expect(fingerFor(0, 5)).toBe('0');
  });
});

describe('inferPos', () => {
  it('reads the position from written fingers', () => {
    const notes = [
      { s: 2, f: 7, finger: '3' },
      { s: 2, f: 5, finger: '1' },
      { s: 1, f: 8, finger: '4' },
    ];
    expect(inferPos(notes)).toBe(5);
  });

  it('falls back to the lowest fretted note', () => {
    expect(inferPos([{ s: 0, f: 9, finger: '' }, { s: 0, f: 0, finger: '0' }])).toBe(9);
  });
});

describe('fitRun', () => {
  // G major run starting on low E string, 3rd fret: G A B C D
  const run = [
    { s: 5, f: 3, finger: '' },
    { s: 5, f: 5, finger: '' },
    { s: 4, f: 2, finger: '' },
    { s: 4, f: 3, finger: '' },
    { s: 4, f: 5, finger: '' },
  ];

  it('keeps every pitch', () => {
    const moved = fitRun(run, 7);
    expect(moved.map(midiOf)).toEqual(run.map(midiOf));
  });

  it('puts notes inside the hand box with matching fingers', () => {
    const moved = fitRun(run, 2);
    for (const n of moved) {
      if (n.f === 0) continue;
      expect(n.f).toBeGreaterThanOrEqual(1);
      expect(n.f).toBeLessThanOrEqual(6);
    }
    expect(moved[0]).toMatchObject({ s: 5, f: 3, finger: '2' });
  });

  it('does not mutate the input', () => {
    const copy = structuredClone(run);
    fitRun(run, 7);
    expect(run).toEqual(copy);
  });
});

describe('alternativesFor', () => {
  it('lists the same pitch elsewhere and flags exactly one best option', () => {
    const note = { s: 1, f: 5, finger: '1' }; // E4 on the B string
    const alts = alternativesFor(note, [], 5, null);
    expect(alts.every((a) => midiOf(a) === midiOf(note))).toBe(true);
    expect(alts.some((a) => a.s === note.s && a.f === note.f)).toBe(false);
    expect(alts.filter((a) => a.best)).toHaveLength(1);
  });

  it('prefers the spot that fits neighbouring notes', () => {
    // neighbours sit around fret 9-12 on G/D strings
    const neighbours = [
      { s: 2, f: 11, finger: '' },
      { s: 3, f: 12, finger: '' },
    ];
    const best = alternativesFor({ s: 0, f: 0, finger: '0' }, neighbours, 9, null).find((a) => a.best);
    expect(best.f).toBeGreaterThanOrEqual(9);
  });
});
