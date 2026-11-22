import { describe, expect, it } from 'vitest';
import { alternativesFor, cagedPositions, fingerFor, fitRun, inferPos, suggestFinger } from './fingering.ts';
import { OPEN, midiOf, parentMajorRoot } from './theory.ts';
import type { Finger, Note } from './types.ts';

const note = (s: number, f: number, finger: Finger = ''): Note => ({ s, f, finger });

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
      note(2, 7, '3'),
      note(2, 5, '1'),
      note(1, 8, '4'),
    ];
    expect(inferPos(notes)).toBe(5);
  });

  it('falls back to the lowest fretted note', () => {
    expect(inferPos([note(0, 9), note(0, 0, '0')])).toBe(9);
  });
});

describe('fitRun', () => {
  // G major run starting on low E string, 3rd fret: G A B C D
  const run = [
    note(5, 3),
    note(5, 5),
    note(4, 2),
    note(4, 3),
    note(4, 5),
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
    expect(moved[0]).toMatchObject(note(5, 3, '2'));
  });

  it('does not mutate the input', () => {
    const copy = structuredClone(run);
    fitRun(run, 7);
    expect(run).toEqual(copy);
  });
});

describe('alternativesFor', () => {
  it('lists the same pitch elsewhere and flags exactly one best option', () => {
    const e4 = note(1, 5, '1'); // E4 on the B string
    const alts = alternativesFor(e4, [], 5, null);
    expect(alts.every((a) => midiOf(a) === midiOf(e4))).toBe(true);
    expect(alts.some((a) => a.s === e4.s && a.f === e4.f)).toBe(false);
    expect(alts.filter((a) => a.best)).toHaveLength(1);
  });

  it('prefers the spot that fits neighbouring notes', () => {
    // neighbours sit around fret 9-12 on G/D strings
    const neighbours = [
      note(2, 11),
      note(3, 12),
    ];
    const best = alternativesFor(note(0, 0, '0'), neighbours, 9, null).find((a) => a.best);
    expect(best?.f).toBeGreaterThanOrEqual(9);
  });
});

describe('CAGED positions and finger suggestions', () => {
  const G_MAJOR = { root: 7, mode: 0 };
  const E_MINOR = { root: 4, mode: 5 }; // Aeolian: parent major is G

  it('places the five shapes for G major at frets 2, 4, 7, 9 and 12 (plus open position)', () => {
    expect(cagedPositions(G_MAJOR)).toEqual([1, 2, 4, 7, 9, 12]);
  });

  it('modes and pentatonics use their parent major shapes', () => {
    expect(parentMajorRoot(E_MINOR)).toBe(7);
    expect(parentMajorRoot({ root: 9, mode: 8 })).toBe(0); // A minor pentatonic -> C major
    expect(parentMajorRoot({ root: 9, mode: 1 })).toBe(7); // A Dorian -> G major
    expect(cagedPositions(E_MINOR)).toEqual(cagedPositions(G_MAJOR));
  });

  it('caged: picks the shape nearest the recent hand', () => {
    // hand in the C shape at fret 7 (A string fret 7 with finger 1)
    const recent = [note(4, 7, '1')];
    expect(suggestFinger(9, recent, G_MAJOR, 'caged')).toBe('3');
    expect(suggestFinger(5, [note(5, 3, '2')], G_MAJOR, 'caged')).toBe('4'); // E shape at 2: fret 5 is the pinky
  });

  it('caged without a key falls back to one finger per fret', () => {
    expect(suggestFinger(6, [note(5, 5, '1')], null, 'caged')).toBe(suggestFinger(6, [note(5, 5, '1')], null, 'perFret'));
  });

  it('perFret: keeps the hand when it reaches, else moves it the least', () => {
    const hand5 = [note(5, 5, '1'), note(5, 7, '3')];
    expect(suggestFinger(8, hand5, null, 'perFret')).toBe('4');
    expect(suggestFinger(9, hand5, null, 'perFret')).toBe('4'); // pinky stretch
    expect(suggestFinger(12, hand5, null, 'perFret')).toBe('4'); // reach up: hand moves so 12 is the pinky
    expect(suggestFinger(2, hand5, null, 'perFret')).toBe('1'); // reach down: index
    expect(suggestFinger(3, [], null, 'perFret')).toBe('1'); // no context
    expect(suggestFinger(0, hand5, null, 'perFret')).toBe(OPEN);
  });
});
