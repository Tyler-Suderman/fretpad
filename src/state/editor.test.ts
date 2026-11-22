import { describe, expect, it } from 'vitest';
import { leadNote, newSheet, noteEvent, sectionRange } from '../music/tab.ts';
import { midiOf } from '../music/theory.ts';
import type { Note } from '../music/types.ts';
import { accepts, createEditorState, currentSheet, editorReducer } from './editor.ts';
import type { Action, EditorState } from './editor.ts';
import { parseSaved } from './storage.ts';

const run = (state: EditorState, ...actions: Action[]): EditorState => actions.reduce(editorReducer, state);
const blank = (): EditorState => createEditorState({ sheets: [newSheet('Test')] });
const sheet = (state: EditorState) => currentSheet(state);
/** Lead note of column i (null for rests, bars and missing columns). */
const lead = (state: EditorState, i: number): Note | null => leadNote(sheet(state).events[i]);
const leads = (state: EditorState): Note[] => sheet(state).events.flatMap((e) => leadNote(e) ?? []);

describe('adding notes', () => {
  it('tap fret → pick finger → note is added after the cursor', () => {
    let s = run(blank(), { type: 'TAP_FRET', s: 2, f: 5 });
    expect(s.mode).toMatchObject({ type: 'picking', s: 2, f: 5, replace: false });
    s = run(s, { type: 'CHOOSE_FINGER', finger: '1' });
    expect(s.mode.type).toBe('adding');
    expect(lead(s, 0)).toEqual({ s: 2, f: 5, finger: '1' });
    expect(sheet(s).cursor).toBe(0);
  });

  it('open strings skip the finger picker', () => {
    const s = run(blank(), { type: 'TAP_FRET', s: 0, f: 0 });
    expect(s.mode.type).toBe('adding');
    expect(lead(s, 0)?.finger).toBe('0');
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
    expect(lead(s, 0)).toEqual({ s: 2, f: 5, finger: '2' });
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
    expect(lead(s, 0)).toEqual({ s: 1, f: 3, finger: '2' });
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
    const s = run(start, { type: 'ENTER_FINGERING' }, { type: 'SELECT_COLUMN', i: 3 }, { type: 'SHIFT_HAND', d: 4 });
    expect(leads(s).map(midiOf)).toEqual(leads(start).map(midiOf));
    expect(leads(s).every((n) => n.finger !== '')).toBe(true);
  });

  it('setting a finger walks to the next note', () => {
    const s = run(runSheet(), { type: 'ENTER_FINGERING' }, { type: 'SET_FINGER', finger: '2' });
    expect(lead(s, 0)?.finger).toBe('2');
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
    expect(saved).not.toBeNull();
    expect(saved?.currentId).toBe('a');
    expect(saved?.settings?.loop).toBe(false);
    expect(saved?.sheets[0]?.events[0]?.kind).toBe('rest');
    expect(saved?.sheets[0]?.bpm).toBe(80);
  });

  it('returns null for missing or broken data', () => {
    expect(parseSaved(null)).toBeNull();
    expect(parseSaved('{oops')).toBeNull();
  });
});

describe('loop section', () => {
  // five notes on the low E string, cursor on the last
  const five = (): EditorState =>
    run(
      blank(),
      ...[1, 2, 3, 4, 5].flatMap((f): Action[] => [
        { type: 'TAP_FRET', s: 5, f },
        { type: 'CHOOSE_FINGER', finger: '1' },
      ]),
    );
  const range = (state: EditorState) => sectionRange(sheet(state));
  const at = (state: EditorState, i: number) => run(state, { type: 'SELECT_COLUMN', i }, { type: 'DONE' });

  it('a start alone runs to the end; an end alone runs from the beginning', () => {
    expect(range(run(at(five(), 1), { type: 'SET_SECTION_START' }))).toEqual({ a: 1, b: 4 });
    expect(range(run(at(five(), 2), { type: 'SET_SECTION_END' }))).toEqual({ a: 0, b: 2 });
  });

  it('start then end makes a section; an edge past the other pushes it back out', () => {
    let state = run(at(five(), 1), { type: 'SET_SECTION_START' });
    state = run(at(state, 3), { type: 'SET_SECTION_END' });
    expect(range(state)).toEqual({ a: 1, b: 3 });
    state = run(at(state, 4), { type: 'SET_SECTION_START' });
    expect(range(state)).toEqual({ a: 4, b: 4 });
  });

  it('follows its columns when notes are added before it, and clears', () => {
    let state = run(at(five(), 2), { type: 'SET_SECTION_START' });
    state = run(at(state, 0), { type: 'TAP_FRET', s: 4, f: 0 }); // open A inserted after column 0
    expect(range(state)).toEqual({ a: 3, b: 5 });
    expect(range(run(state, { type: 'CLEAR_SECTION' }))).toBeNull();
  });

  it('is gone if one of its edge columns is deleted', () => {
    const state = run(at(five(), 4), { type: 'SET_SECTION_END' }, { type: 'DELETE' });
    expect(range(state)).toBeNull();
  });

  it('in Reconfinger, the brackets take the selected run', () => {
    const state = run(
      at(five(), 1),
      { type: 'ENTER_FINGERING' },
      { type: 'SELECT_COLUMN', i: 3 },
      { type: 'SET_SECTION_START' },
      { type: 'SET_SECTION_END' },
    );
    expect(range(state)).toEqual({ a: 1, b: 3 });
  });
});

describe('finger suggestions while adding', () => {
  it('Enter (ACCEPT_SUGGESTION) adds the note with the suggested finger', () => {
    let state = run(blank(), { type: 'TAP_FRET', s: 5, f: 5 }, { type: 'CHOOSE_FINGER', finger: '1' });
    state = run(state, { type: 'TAP_FRET', s: 5, f: 7 });
    expect(state.mode).toMatchObject({ type: 'picking', suggest: '3' });
    state = run(state, { type: 'ACCEPT_SUGGESTION' });
    expect(lead(state, 1)).toEqual({ s: 5, f: 7, finger: '3' });
  });

  it('uses the CAGED shapes once the sheet is set to CAGED', () => {
    const state = run(
      blank(),
      { type: 'SET_KEY', key: { root: 7, mode: 0 } }, // G major
      { type: 'SET_SYSTEM', system: 'caged' },
      { type: 'TAP_FRET', s: 5, f: 3 },
    );
    expect(state.mode).toMatchObject({ suggest: '2' }); // E shape: root under finger 2
  });
});
