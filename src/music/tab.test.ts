import { describe, expect, it } from 'vitest';
import { toAscii } from './ascii.ts';
import { barEvent, neighbourNotes, newSheet, noteEvent, restEvent, sampleSheet, stepToNote } from './tab.ts';

describe('tab model', () => {
  it('stores open strings with the open finger', () => {
    expect(noteEvent(2, 0, '3').notes[0].finger).toBe('0');
  });

  it('steps between note columns, skipping bars and rests', () => {
    const events = [noteEvent(0, 1, '1'), barEvent(), restEvent(), noteEvent(0, 3, '3')];
    expect(stepToNote(events, 0, 1)).toBe(3);
    expect(stepToNote(events, 3, -1)).toBe(0);
    expect(stepToNote(events, 3, 1)).toBe(-1);
  });

  it('collects neighbouring notes either side', () => {
    const events = [1, 2, 3, 4, 5].map((f) => noteEvent(0, f, ''));
    expect(neighbourNotes(events, 2, 1).map((n) => n.f)).toEqual([2, 4]);
  });

  it('builds the sample warm-up', () => {
    const s = sampleSheet();
    expect(s.events.filter((e) => e.kind === 'notes')).toHaveLength(24);
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
