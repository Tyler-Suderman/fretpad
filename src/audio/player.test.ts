import { describe, expect, it } from 'vitest';
import { barEvent, noteEvent, restEvent } from '../music/tab.ts';
import { loopRestart } from './player.ts';

const n = (s: number, f: number) => noteEvent(s, f, '');

describe('loopRestart', () => {
  it('skips the first column when the loop ends on the same pitch it starts with', () => {
    const scale = [n(5, 8), n(5, 10), n(4, 7), n(5, 10), n(5, 8)]; // C D E D C
    expect(loopRestart(scale, 0, 4)).toBe(1);
  });

  it('matches by pitch, not by string and fret', () => {
    expect(loopRestart([n(4, 5), n(4, 7), n(5, 10)], 0, 2)).toBe(1); // D3 on the A string and the low E
  });

  it('ignores bar lines at either end, and works inside a section', () => {
    const events = [n(0, 1), barEvent(), n(5, 8), n(5, 10), n(5, 8), barEvent(), n(0, 3)];
    expect(loopRestart(events, 1, 5)).toBe(3);
  });

  it('starts from the top otherwise', () => {
    expect(loopRestart([n(5, 8), n(5, 10), n(4, 7)], 0, 2)).toBe(0);
    expect(loopRestart([restEvent(), n(5, 8), restEvent()], 0, 2)).toBe(0);
    expect(loopRestart([n(5, 8)], 0, 0)).toBe(0); // a single note loops on itself
  });
});
