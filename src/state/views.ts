// View models: derive what each part of the screen shows from editor state. Pure.
import { alternativesFor } from '../music/fingering.ts';
import { isNotes, leadNote, neighbourNotes, noteIndicesBetween } from '../music/tab.ts';
import { midiOf, scaleOf } from '../music/theory.ts';
import type { Scale } from '../music/theory.ts';
import type { Alternative, Column, Key, Note, Spot } from '../music/types.ts';
import { currentSheet } from './editor.ts';
import type { EditorState } from './editor.ts';

export interface StaffNote extends Note {
  outOfKey: boolean;
}

export interface StaffColumn {
  i: number;
  id: string;
  kind: Column['kind'];
  notes: StaffNote[];
  selected: boolean;
  inRange: boolean;
  editing: boolean;
  playing: boolean;
}

export interface StaffView {
  columns: StaffColumn[];
  startSelected: boolean;
  key: Key | null;
}

/** Columns of the tab staff with their highlight flags. */
export function staffView(state: EditorState, playingIndex: number): StaffView {
  const sheet = currentSheet(state);
  const { mode } = state;
  const scale = scaleOf(sheet.key);
  const columns = sheet.events.map(
    (ev, i): StaffColumn => ({
      i,
      id: ev.id,
      kind: ev.kind,
      notes: isNotes(ev) ? ev.notes.map((n) => ({ ...n, outOfKey: scale !== null && !scale.has(midiOf(n) % 12) })) : [],
      selected: mode.type !== 'fingering' && i === sheet.cursor,
      inRange: mode.type === 'fingering' && i >= mode.a && i <= mode.b,
      editing: mode.type === 'fingering' ? mode.a === mode.b && i === mode.a : mode.type === 'editing' && i === sheet.cursor,
      playing: i === playingIndex,
    }),
  );
  return { columns, startSelected: mode.type !== 'fingering' && sheet.cursor === -1, key: sheet.key };
}

export interface FretboardView {
  shown: readonly Note[];
  pending: Spot | null;
  alternatives: Alternative[];
  /** Fret under finger 1 in fingering mode, else null. */
  hand: number | null;
  scale: Scale | null;
  root: number | null;
}

/** What the fretboard marks: notes shown, a pending tap, same-pitch alternatives, the hand box, the scale. */
export function fretboardView(state: EditorState, playingIndex: number): FretboardView {
  const sheet = currentSheet(state);
  const { mode } = state;
  const { events } = sheet;
  const notesAt = (i: number): readonly Note[] => {
    const col = events[i];
    return isNotes(col) ? col.notes : [];
  };
  const view: FretboardView = {
    shown: [],
    pending: null,
    alternatives: [],
    hand: mode.type === 'fingering' ? mode.pos : null,
    scale: state.settings.showScale ? scaleOf(sheet.key) : null,
    root: sheet.key?.root ?? null,
  };

  if (playingIndex >= 0) {
    view.shown = notesAt(playingIndex);
  } else if (mode.type === 'fingering') {
    const shown = noteIndicesBetween(events, mode.a, mode.b).flatMap((i) => leadNote(events[i]) ?? []);
    view.shown = shown;
    const only = shown[0];
    if (mode.a === mode.b && only) {
      view.alternatives = alternativesFor(only, neighbourNotes(events, mode.a), mode.pos, scaleOf(sheet.key));
    }
  } else {
    view.shown = notesAt(sheet.cursor);
    if (mode.type === 'picking') view.pending = { s: mode.s, f: mode.f };
  }
  return view;
}
