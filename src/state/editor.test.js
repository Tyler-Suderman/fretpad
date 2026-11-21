import { describe, expect, it } from 'vitest';
import { midiOf } from '../music/theory.ts';
import { newSheet, noteEvent } from '../music/tab.ts';
import { accepts, createEditorState, currentSheet, editorReducer } from './editor.js';
import { parseSaved } from './storage.js';

const run = (state, ...actions) => actions.reduce(editorReducer, state);
const blank = () => createEditorState({ sheets: [newSheet('Test')] });
const sheet = (state) => currentSheet(state);

describe('adding notes', () => {
  it('tap fret → pick finger → note is added after the cursor', () => {
    let s = run(blank(), { type: 'TAP_FRET', s: 2, f: 5 });
    expect(s.mode).toEqual({ type: 'picking', s: 2, f: 5, replace: false });
    s = run(s, { type: 'CHOOSE_FINGER', finger: '1' });
    expect(s.mode.type).toBe('adding');
    expect(sheet(s).events[0].notes[0]).toEqual({ s: 2, f: 5, finger: '1' });
    expect(sheet(s).cursor).toBe(0);
  });

  it('open strings skip the finger picker', () => {
    const s = run(blank(), { type: 'TAP_FRET', s: 0, f: 0 });
    expect(s.mode.type).toBe('adding');
    expect(sheet(s).events[0].notes[0].finger).toBe('0');
  });

  it('cancel leaves the sheet unchanged', () => {
    const s = run(blank(), { type: 'TAP_FRET', s: 2, f: 5 }, { type: 'CANCEL' });
    expect(sheet(s).events).toHaveLength(0);
    expect(s.mode.type).toBe('adding');
  });

  it('ignores actions the current mode does not accept', () => {
    const s = blank();
    expect(editorReducer(s, { type: 'CHOOSE_FINGER', finger: '1' })).toBe(s);
    expect(accepts(s, 'CHOOSE_FINGER')).toBe(false);
    expect(accepts(s, 'TAP_FRET')).toBe(true);
  });
});

describe('editing a placed note', () => {
  const twoNotes = () =>
    run(
      blank(),
      { type: 'TAP_FRET', s: 2, f: 5 },
      { type: 'CHOOSE_FINGER', finger: '1' },
      { type: 'TAP_FRET', s: 2, f: 7 },
      { type: 'CHOOSE_FINGER', finger: '3' },
    );

  it('selecting a note enters editing; tapping it again goes back to adding', () => {
    let s = run(twoNotes(), { type: 'SELECT_COLUMN', i: 0 });
    expect(s.mode.type).toBe('editing');
    s = run(s, { type: 'SELECT_COLUMN', i: 0 });
    expect(s.mode.type).toBe('adding');
    expect(sheet(s).cursor).toBe(0);
  });

  it('changes only the finger', () => {
    const s = run(twoNotes(), { type: 'SELECT_COLUMN', i: 0 }, { type: 'SET_FINGER', finger: '2' });
    expect(sheet(s).events[0].notes[0]).toEqual({ s: 2, f: 5, finger: '2' });
    expect(sheet(s).events).toHaveLength(2);
  });

  it('replaces the note in place when a fret is tapped', () => {
    const s = run(
      twoNotes(),
      { type: 'SELECT_COLUMN', i: 0 },
      { type: 'TAP_FRET', s: 1, f: 3 },
      { type: 'CHOOSE_FINGER', finger: '2' },
    );
    expect(sheet(s).events).toHaveLength(2);
    expect(sheet(s).events[0].notes[0]).toEqual({ s: 1, f: 3, finger: '2' });
  });

  it('undo restores the previous sheet', () => {
    const before = twoNotes();
    const s = run(before, { type: 'SELECT_COLUMN', i: 0 }, { type: 'DELETE' }, { type: 'UNDO' });
    expect(sheet(s).events).toEqual(sheet(before).events);
  });
});

describe('fingering mode', () => {
  const runSheet = () => {
    const sh = newSheet('Run');
    sh.events = [noteEvent(5, 3, ''), noteEvent(5, 5, ''), noteEvent(4, 2, ''), noteEvent(4, 3, '')];
    sh.cursor = 0;
    return createEditorState({ sheets: [sh] });
  };

  it('selects a run like a range picker', () => {
    const s = run(runSheet(), { type: 'ENTER_FINGERING' }, { type: 'SELECT_COLUMN', i: 3 });
    expect(s.mode).toMatchObject({ type: 'fingering', a: 0, b: 3 });
  });

  it('shifting the hand keeps pitches and re-fingers', () => {
    const start = runSheet();
    const pitches = sheet(start).events.map((e) => midiOf(e.notes[0]));
    const s = run(start, { type: 'ENTER_FINGERING' }, { type: 'SELECT_COLUMN', i: 3 }, { type: 'SHIFT_HAND', d: 4 });
    expect(sheet(s).events.map((e) => midiOf(e.notes[0]))).toEqual(pitches);
    expect(sheet(s).events.every((e) => e.notes[0].finger !== '')).toBe(true);
  });

  it('setting a finger walks to the next note', () => {
    const s = run(runSheet(), { type: 'ENTER_FINGERING' }, { type: 'SET_FINGER', finger: '2' });
    expect(sheet(s).events[0].notes[0].finger).toBe('2');
    expect(s.mode).toMatchObject({ a: 1, b: 1 });
  });

  it('exit returns to adding with the cursor at the end of the selection', () => {
    const s = run(runSheet(), { type: 'ENTER_FINGERING' }, { type: 'SELECT_COLUMN', i: 2 }, { type: 'EXIT' });
    expect(s.mode.type).toBe('adding');
    expect(sheet(s).cursor).toBe(2);
  });
});

describe('storage', () => {
  it('reads the prototype format and renames gap to rest', () => {
    const legacy = JSON.stringify({
      sheets: [{ id: 'a', title: 'Old', events: [{ id: 'x', kind: 'gap' }], cursor: 0 }],
      current: 'a',
      loop: false,
      click: true,
    });
    const saved = parseSaved(legacy);
    expect(saved.currentId).toBe('a');
    expect(saved.settings.loop).toBe(false);
    expect(saved.sheets[0].events[0].kind).toBe('rest');
    expect(saved.sheets[0].bpm).toBe(80);
  });

  it('returns null for missing or broken data', () => {
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved('{oops')).toBeNull();
  });
});
