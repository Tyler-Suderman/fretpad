// View models: derive what each part of the screen shows from editor state. Pure.
import { alternativesFor } from '../music/fingering.ts';
import { isNotes, leadNote, neighbourNotes, noteIndicesBetween, sectionRange } from '../music/tab.ts';
import { keyName, midiAt, midiOf, scaleOf } from '../music/theory.ts';
import type { Scale } from '../music/theory.ts';
import type { Alternative, Column, Division, Key, Note, Sheet, Spot } from '../music/types.ts';
import { currentSheet } from './editor.ts';
import type { EditorState } from './editor.ts';

/** Note values a column can take, with their labels. */
export const DIVISIONS: readonly { value: Division; label: string }[] = [
  { value: 4, label: '♩ quarters' },
  { value: 8, label: '♪ eighths' },
  { value: 16, label: '16ths' },
];

/** One-line summary of a sheet's setup for the collapsed setup row, key first, e.g. "A Dorian · ♪ eighths". */
export const setupSummary = (sheet: Sheet): string =>
  `${keyName(sheet.key) || 'No key'} · ${DIVISIONS.find((d) => d.value === sheet.div)?.label ?? ''}`;

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
  /** Inside the loop section, and whether it is the section's first or last column. */
  inSection: boolean;
  sectionStart: boolean;
  sectionEnd: boolean;
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
  const section = sectionRange(sheet);
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
      inSection: section !== null && i >= section.a && i <= section.b,
      sectionStart: section?.a === i,
      sectionEnd: section?.b === i,
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
  /** Pitch (MIDI) of the one note in focus (tapped, selected or playing); same-pitch spots and octaves are marked against it. */
  focus: number | null;
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
    focus: null,
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
  const only = view.shown.length === 1 ? view.shown[0] : undefined;
  view.focus = view.pending ? midiAt(view.pending.s, view.pending.f) : only ? midiOf(only) : null;
  return view;
}
