import { describe, expect, it } from 'vitest';
import { barEvent, newSheet, noteEvent, restEvent } from '../music/tab.ts';
import { midiAt } from '../music/theory.ts';
import { createEditorState, editorReducer } from './editor.ts';
import type { Action, EditorState } from './editor.ts';
import { fretboardView, measureStarts } from './views.ts';

const run = (state: EditorState, ...actions: Action[]): EditorState => actions.reduce(editorReducer, state);
const blank = (): EditorState => createEditorState({ sheets: [newSheet('Test')] });

describe('fretboard focus (same pitch and octave marks)', () => {
  it('is the tapped fret while picking a finger', () => {
    const state = run(blank(), { type: 'TAP_FRET', s: 4, f: 5 });
    expect(fretboardView(state, -1).focus).toBe(midiAt(4, 5));
  });

  it('is the selected note once placed', () => {
    const state = run(blank(), { type: 'TAP_FRET', s: 2, f: 4 }, { type: 'CHOOSE_FINGER', finger: '4' });
    expect(fretboardView(state, -1).focus).toBe(midiAt(2, 4));
  });

  it('is empty with nothing selected', () => {
    expect(fretboardView(blank(), -1).focus).toBeNull();
  });
});

describe('measure lines (4/4)', () => {
  const notes = (n: number) => Array.from({ length: n }, () => noteEvent(5, 1, '1'));

  it('start every div timed columns; rests count, bar lines restart the count', () => {
    expect([...measureStarts(notes(9), 4)]).toEqual([4, 8]);
    expect([...measureStarts([...notes(3), restEvent(), ...notes(2)], 4)]).toEqual([4]);
    // bar after 2 columns restarts: next measure line 4 timed columns after the bar
    expect([...measureStarts([...notes(2), barEvent(), ...notes(5)], 4)]).toEqual([7]);
    expect([...measureStarts(notes(17), 8)]).toEqual([8, 16]);
  });
});
