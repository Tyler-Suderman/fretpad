import { describe, expect, it } from 'vitest';
import { newSheet } from '../music/tab.ts';
import { midiAt } from '../music/theory.ts';
import { createEditorState, editorReducer } from './editor.ts';
import type { Action, EditorState } from './editor.ts';
import { fretboardView } from './views.ts';

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

  it('is empty with nothing selected or a run selected', () => {
    expect(fretboardView(blank(), -1).focus).toBeNull();
    const state = run(
      blank(),
      { type: 'TAP_FRET', s: 5, f: 1 },
      { type: 'CHOOSE_FINGER', finger: '1' },
      { type: 'TAP_FRET', s: 5, f: 2 },
      { type: 'CHOOSE_FINGER', finger: '2' },
      { type: 'ENTER_FINGERING' },
      { type: 'STEP', d: -1, extend: true },
    );
    expect(fretboardView(state, -1).focus).toBeNull();
  });
});
