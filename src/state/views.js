// View models: derive what each part of the screen shows from editor state. Pure.
import { alternativesFor } from '../music/fingering.js';
import { isNotes, leadNote, neighbourNotes, noteIndicesBetween } from '../music/tab.js';
import { midiOf, scaleOf } from '../music/theory.js';
import { currentSheet } from './editor.js';

/** Columns of the tab staff with their highlight flags. */
export function staffView(state, playingIndex) {
  const sheet = currentSheet(state);
  const { mode } = state;
  const scale = scaleOf(sheet.key);
  const fingering = mode.type === 'fingering';
  const columns = sheet.events.map((ev, i) => ({
    i,
    id: ev.id,
    kind: ev.kind,
    notes: isNotes(ev) ? ev.notes.map((n) => ({ ...n, outOfKey: Boolean(scale) && !scale.has(midiOf(n) % 12) })) : [],
    selected: !fingering && i === sheet.cursor,
    inRange: fingering && i >= mode.a && i <= mode.b,
    editing: fingering ? mode.a === mode.b && i === mode.a : mode.type === 'editing' && i === sheet.cursor,
    playing: i === playingIndex,
  }));
  return { columns, startSelected: !fingering && sheet.cursor === -1, key: sheet.key };
}

/** What the fretboard marks: notes shown, a pending tap, same-pitch alternatives, the hand box, the scale. */
export function fretboardView(state, playingIndex) {
  const sheet = currentSheet(state);
  const { mode } = state;
  const { events } = sheet;
  const view = {
    shown: [],
    pending: null,
    alternatives: [],
    hand: mode.type === 'fingering' ? mode.pos : null,
    scale: state.settings.showScale ? scaleOf(sheet.key) : null,
    root: sheet.key?.root ?? null,
  };
  if (playingIndex >= 0) {
    view.shown = events[playingIndex]?.notes ?? [];
  } else if (mode.type === 'fingering') {
    view.shown = noteIndicesBetween(events, mode.a, mode.b).map((i) => leadNote(events[i]));
    if (mode.a === mode.b) {
      view.alternatives = alternativesFor(view.shown[0], neighbourNotes(events, mode.a), mode.pos, scaleOf(sheet.key));
    }
  } else {
    view.shown = events[sheet.cursor]?.notes ?? [];
    if (mode.type === 'picking') view.pending = { s: mode.s, f: mode.f };
  }
  return view;
}
