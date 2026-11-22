import { describe, expect, it } from 'vitest';
import { toAscii } from './ascii.ts';
import { barEvent, newSheet, noteEvent, restEvent } from './tab.ts';

describe('tab model', () => {
  it('stores open strings with the open finger', () => {
    expect(noteEvent(2, 0, '3').notes[0].finger).toBe('0');
  });
});

describe('toAscii', () => {
  it('ends the staff on a closing bar line without doubling it', () => {
    const sheet = { ...newSheet(''), events: [noteEvent(0, 1, '1'), barEvent()] };
    expect(toAscii(sheet).split('\n')[0]).toBe('e|-1-|');
  });

  it('writes six strings, bar lines and a finger row', () => {
    const sheet = {
      ...newSheet('Run'),
      key: { root: 7, mode: 0 },
      events: [noteEvent(5, 3, '2'), noteEvent(5, 5, '4'), barEvent(), noteEvent(4, 2, '1'), restEvent()],
    };
    expect(toAscii(sheet)).toBe(
      [
        'Run',
        'Key: G Ionian (major)',
        '',
        'e|-----|-----|',
        'B|-----|-----|',
        'G|-----|-----|',
        'D|-----|-----|',
        'A|-----|-2---|',
        'E|-3-5-|-----|',
        '   2 4   1',
        '',
      ].join('\n'),
    );
  });
});
