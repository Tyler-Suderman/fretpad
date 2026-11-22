import { describe, expect, it } from 'vitest';
import { cagedPositions, fingerFor, inferPos, suggestFinger } from './fingering.ts';
import { OPEN, parentMajorRoot } from './theory.ts';
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

  const at = (f: number, s = 5) => ({ s, f });

  it('caged: picks the shape nearest the recent hand', () => {
    // hand in the C shape at fret 7 (A string fret 7 with finger 1)
    const recent = [note(4, 7, '1')];
    expect(suggestFinger(at(9), recent, G_MAJOR, 'caged')).toBe('3');
    expect(suggestFinger(at(5), [note(5, 3, '2')], G_MAJOR, 'caged')).toBe('4'); // E shape at 2: fret 5 is the pinky
  });

  it('caged without a key falls back to one finger per fret', () => {
    expect(suggestFinger(at(6), [note(5, 5, '1')], null, 'caged')).toBe(suggestFinger(at(6), [note(5, 5, '1')], null, 'perFret'));
  });

  it('follows the hand: rolls across strings, stretches 1 to 4, shifts on the index', () => {
    // index on C4 (G string fret 5), then E4 on the next string at the same fret: roll the index
    expect(suggestFinger({ s: 1, f: 5 }, [note(2, 5, '1'), note(1, 8, '4')], G_MAJOR, 'caged')).toBe('1');
    // index on fret 5, then fret 8 on the next string: a 1-4 stretch, not a new box
    expect(suggestFinger({ s: 1, f: 8 }, [note(1, 5, '1'), note(2, 5, '1')], G_MAJOR, 'caged')).toBe('4');
    // after a 1-4 stretch from fret 3 to fret 7, fret 4 on the next string down: the index shifts up a fret
    expect(suggestFinger({ s: 2, f: 4 }, [note(1, 7, '4'), note(1, 3, '1')], G_MAJOR, 'caged')).toBe('1');
  });

  it('perFret: keeps the hand when it reaches, else moves it the least', () => {
    const hand5 = [note(5, 5, '1'), note(5, 7, '3')];
    expect(suggestFinger(at(8), hand5, null, 'perFret')).toBe('4');
    expect(suggestFinger(at(9), hand5, null, 'perFret')).toBe('4'); // pinky stretch
    expect(suggestFinger(at(12), hand5, null, 'perFret')).toBe('1'); // too far to reach: shift, leading with the index
    expect(suggestFinger(at(2), hand5, null, 'perFret')).toBe('1'); // reach down: index
    expect(suggestFinger(at(3), [], null, 'perFret')).toBe('1'); // no context
    expect(suggestFinger(at(0), hand5, null, 'perFret')).toBe(OPEN);
  });
});
