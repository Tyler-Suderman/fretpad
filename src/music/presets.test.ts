import { describe, expect, it } from 'vitest';
import { PRESETS, presetSheet } from './presets.ts';
import { leadNote } from './tab.ts';
import { midiOf, noteName, scaleOf } from './theory.ts';
import type { Note } from './types.ts';

const notes = (id: Parameters<typeof presetSheet>[0]): Note[] => presetSheet(id).events.flatMap((e) => leadNote(e) ?? []);
const names = (ns: Note[]) => ns.map((n) => noteName(n.s, n.f));

describe('presets', () => {
  it('C major: two octaves up from low E fret 8 and back, in 7th position', () => {
    const ns = notes('c-major');
    expect(names(ns).slice(0, 8)).toEqual(['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']);
    expect(names(ns)[14]).toBe('C5');
    expect(names(ns).at(-1)).toBe('C3');
    expect(ns).toHaveLength(29);
    expect(ns[0]).toEqual({ s: 5, f: 8, finger: '2' });
  });

  it('A minor pentatonic: box 1 at fret 5, A2 to A4 and back', () => {
    const ns = notes('a-minor-pentatonic');
    expect(names(ns).slice(0, 6)).toEqual(['A2', 'C3', 'D3', 'E3', 'G3', 'A3']);
    expect(names(ns)[10]).toBe('A4');
    expect(ns.every((n) => n.f >= 5 && n.f <= 8)).toBe(true);
    expect(ns.slice(0, 2).map((n) => n.finger)).toEqual(['1', '4']);
  });

  it('climbing sevenths: 1 3 5 7 8 7 5 3 from every degree to the octave, then the scale down', () => {
    const ns = names(notes('c-major-sevenths'));
    expect(ns.slice(0, 8)).toEqual(['C3', 'E3', 'G3', 'B3', 'C4', 'B3', 'G3', 'E3']);
    expect(ns.slice(8, 16)).toEqual(['D3', 'F3', 'A3', 'C4', 'D4', 'C4', 'A3', 'F3']);
    expect(ns.slice(56, 64)).toEqual(['C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4']);
    expect(ns.slice(64)).toEqual(['D4', 'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3']);
  });

  it('A major four chords: the written run, copied note for note with fresh ids', () => {
    const sheet = presetSheet('a-major-four-chords');
    const ns = notes('a-major-four-chords');
    expect(ns).toHaveLength(128);
    expect(ns[0]).toEqual({ s: 5, f: 5, finger: '2' }); // Amaj9 from A2
    expect(ns[96]).toEqual({ s: 5, f: 10, finger: '2' }); // Dmaj9 from low E fret 10
    expect(sheet.key).toEqual({ root: 9, mode: 0 });
    expect(new Set(sheet.events.map((e) => e.id)).size).toBe(128);
    expect(presetSheet('a-major-four-chords').events[0]?.id).not.toBe(sheet.events[0]?.id);
  });

  it('every generated preset stays in its key and in one position, with a finger on every note', () => {
    for (const { id } of PRESETS.filter((p) => p.id !== 'a-major-four-chords')) {
      const sheet = presetSheet(id);
      const scale = scaleOf(sheet.key)!;
      const ns = notes(id);
      const frets = ns.map((n) => n.f);
      expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
      expect(ns.every((n) => scale.has(midiOf(n) % 12))).toBe(true);
      expect(ns.every((n) => ['1', '2', '3', '4'].includes(n.finger))).toBe(true);
    }
  });
});
