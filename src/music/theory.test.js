import { describe, expect, it } from 'vitest';
import { keyName, midiOf, noteName, scaleOf, spotsFor } from './theory.js';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const spell = (key) =>
  [...scaleOf(key)]
    .sort((a, b) => ((a - key.root + 12) % 12) - ((b - key.root + 12) % 12))
    .map((pc) => NAMES[pc])
    .join(' ');

describe('scales', () => {
  it('builds modes as rotations of the major scale', () => {
    expect(spell({ root: 7, mode: 0 })).toBe('G A B C D E F#'); // G Ionian
    expect(spell({ root: 9, mode: 1 })).toBe('A B C D E F# G'); // A Dorian
    expect(spell({ root: 4, mode: 5 })).toBe('E F# G A B C D'); // E Aeolian
  });

  it('builds pentatonics', () => {
    expect(spell({ root: 9, mode: 8 })).toBe('A C D E G'); // A minor pentatonic
  });

  it('returns no scale when no key is set', () => {
    expect(scaleOf(null)).toBeNull();
    expect(keyName(null)).toBe('');
  });

  it('names keys', () => {
    expect(keyName({ root: 7, mode: 0 })).toBe('G Ionian (major)');
  });
});

describe('fretboard', () => {
  it('names notes with octave', () => {
    expect(noteName(5, 0)).toBe('E2'); // low E open
    expect(noteName(0, 5)).toBe('A4'); // high e, 5th fret
  });

  it('finds every spot for a pitch', () => {
    const spots = spotsFor(midiOf({ s: 0, f: 0 })); // E4
    expect(spots).toEqual(
      expect.arrayContaining([
        { s: 0, f: 0 },
        { s: 1, f: 5 },
        { s: 2, f: 9 },
        { s: 3, f: 14 },
      ]),
    );
    expect(spots).toHaveLength(4);
  });
});
