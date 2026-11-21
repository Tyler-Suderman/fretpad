// The editor as a small state machine, used with React's useReducer.
//
// Modes (state.mode.type):
//   adding     tapping a fret adds a note after the cursor
//   picking    a fret was tapped; waiting for a finger   { s, f, replace }
//   editing    a placed note/rest is selected; a fret tap replaces it, a finger changes it
//   fingering  re-finger a run of notes keeping pitches  { a, b, pos }  (columns a..b, hand at fret pos)
//
// Each mode lists the actions it accepts. An action a mode does not list is ignored, so UI states
// can't leak into each other. GLOBAL actions work in every mode.
import { alternativesFor, clampPos, fingerFor, fitRun, inBox, inferPos } from '../music/fingering.js';
import {
  barEvent,
  isNotes,
  isReplaceable,
  leadNote,
  neighbourNotes,
  newSheet,
  noteEvent,
  noteIndicesBetween,
  restEvent,
  sampleSheet,
  stepToNote,
} from '../music/tab.js';
import { FRETS, OPEN, midiAt, midiOf, scaleOf } from '../music/theory.js';

const MAX_UNDO = 100;
export const ADDING = { type: 'adding' };

/* ---------- state helpers ---------- */

export const currentSheet = (state) =>
  state.doc.sheets.find((s) => s.id === state.doc.currentId) ?? state.doc.sheets[0];

const replaceSheet = (state, sheet) => ({
  ...state,
  doc: { ...state.doc, sheets: state.doc.sheets.map((s) => (s.id === sheet.id ? sheet : s)) },
});

/** Change sheet fields without an undo step (title, tempo, cursor…). */
const patch = (state, fields) => replaceSheet(state, { ...currentSheet(state), ...fields });

/** Undoable edit: `fn` mutates a draft copy of the current sheet. */
function change(state, fn) {
  const sheet = currentSheet(state);
  const draft = structuredClone(sheet);
  fn(draft);
  const undo = [...state.undo, { events: sheet.events, cursor: sheet.cursor }].slice(-MAX_UNDO);
  return { ...replaceSheet(state, draft), undo };
}

const to = (state, mode) => ({ ...state, mode });

/* ---------- shared edits ---------- */

const insert = (state, ev) =>
  to(
    change(state, (d) => {
      d.events.splice(d.cursor + 1, 0, ev);
      d.cursor += 1;
    }),
    ADDING,
  );

const replaceAtCursor = (state, s, f, finger) =>
  to(
    change(state, (d) => {
      d.events[d.cursor] = { ...noteEvent(s, f, finger), id: d.events[d.cursor].id };
    }),
    ADDING,
  );

function setLeadFinger(state, i, finger) {
  const n = leadNote(currentSheet(state).events[i]);
  if (!n || n.f === 0) return state;
  return change(state, (d) => {
    d.events[i].notes[0].finger = finger;
  });
}

function deleteAtCursor(state) {
  if (currentSheet(state).cursor < 0) return state;
  return to(
    change(state, (d) => {
      d.events.splice(d.cursor, 1);
      d.cursor = Math.max(-1, d.cursor - 1);
    }),
    ADDING,
  );
}

function moveCursor(state, { d }) {
  const sheet = currentSheet(state);
  return to(patch(state, { cursor: Math.max(-1, Math.min(sheet.events.length - 1, sheet.cursor + d)) }), ADDING);
}

function nudgeFret(state, { d }) {
  const sheet = currentSheet(state);
  const n = leadNote(sheet.events[sheet.cursor]);
  if (!n || n.f + d < 0 || n.f + d > FRETS) return state;
  return change(state, (draft) => {
    const note = draft.events[draft.cursor].notes[0];
    note.f += d;
    if (note.f === 0) note.finger = OPEN;
    else if (note.finger === OPEN) note.finger = '';
  });
}

function selectColumn(state, { i }) {
  const sheet = currentSheet(state);
  const tappedAgain = state.mode.type === 'editing' && sheet.cursor === i;
  const editable = isReplaceable(sheet.events[i]) && !tappedAgain;
  return to(patch(state, { cursor: i }), editable ? { type: 'editing' } : ADDING);
}

function tapFret(state, { s, f }, replace) {
  if (f === 0) return replace ? replaceAtCursor(state, s, 0, OPEN) : insert(state, noteEvent(s, 0, OPEN));
  return to(state, { type: 'picking', s, f, replace });
}

function enterFingering(state) {
  const { events, cursor } = currentSheet(state);
  const i = isNotes(events[cursor]) ? cursor : events.findIndex(isNotes);
  if (i < 0) return state;
  return to(state, { type: 'fingering', a: i, b: i, pos: inferPos([leadNote(events[i])]) });
}

/* ---------- fingering mode ---------- */

function fxSelect(state, i, extend) {
  const { events } = currentSheet(state);
  if (!isNotes(events[i])) return state;
  const m = state.mode;
  const a = extend ? Math.min(m.a, i) : i;
  const b = extend ? Math.max(m.b, i) : i;
  const pos = inferPos(noteIndicesBetween(events, a, b).map((j) => leadNote(events[j])));
  return to(state, { ...m, a, b, pos });
}

function fxFit(state, pos) {
  const m = state.mode;
  const hand = clampPos(pos);
  const next = change(state, (d) => {
    const idx = noteIndicesBetween(d.events, m.a, m.b);
    const moved = fitRun(idx.map((j) => leadNote(d.events[j])), hand);
    idx.forEach((j, k) => {
      d.events[j].notes[0] = moved[k];
    });
  });
  return to(next, { ...m, pos: hand });
}

function fxTapFret(state, { s, f }) {
  const m = state.mode;
  if (m.a !== m.b) return f > 0 ? fxFit(state, f) : state; // with a run selected, a fret tap sets finger 1 there
  const sheet = currentSheet(state);
  const note = leadNote(sheet.events[m.a]);
  const samePitch = midiAt(s, f) === midiOf(note) && !(s === note.s && f === note.f);
  let finger;
  let pos = m.pos;
  if (samePitch) {
    const alt = alternativesFor(note, neighbourNotes(sheet.events, m.a), m.pos, scaleOf(sheet.key)).find(
      (o) => o.s === s && o.f === f,
    );
    finger = alt.finger;
    pos = alt.pos;
  } else {
    finger = f === 0 ? OPEN : inBox(f, m.pos) ? fingerFor(f, m.pos) : '';
  }
  const next = change(state, (d) => {
    d.events[m.a].notes[0] = { s, f, finger };
  });
  return to(next, { ...m, pos });
}

function fxSetFinger(state, { finger }) {
  const m = state.mode;
  if (m.a !== m.b) return state;
  const next = setLeadFinger(state, m.a, finger);
  const j = stepToNote(currentSheet(next).events, m.a, 1); // walk forward through the passage
  return j < 0 ? next : fxSelect(next, j, false);
}

/* ---------- the machine ---------- */

const GLOBAL = {
  SWITCH_SHEET: (state, { id }) => ({ ...state, doc: { ...state.doc, currentId: id }, mode: ADDING, undo: [] }),
  NEW_SHEET: (state) => {
    const sheet = newSheet();
    return { ...state, doc: { sheets: [sheet, ...state.doc.sheets], currentId: sheet.id }, mode: ADDING, undo: [] };
  },
  DELETE_SHEET: (state) => {
    let sheets = state.doc.sheets.filter((s) => s.id !== state.doc.currentId);
    if (!sheets.length) sheets = [newSheet()];
    return { ...state, doc: { sheets, currentId: sheets[0].id }, mode: ADDING, undo: [] };
  },
  RENAME: (state, { title }) => patch(state, { title }),
  SET_TEMPO: (state, { bpm }) =>
    patch(state, { bpm: Math.max(30, Math.min(260, Math.round(bpm) || currentSheet(state).bpm)) }),
  SET_DIVISION: (state, { div }) => patch(state, { div }),
  SET_KEY: (state, { key }) => patch(state, { key }),
  TOGGLE: (state, { setting }) => ({ ...state, settings: { ...state.settings, [setting]: !state.settings[setting] } }),
  UNDO: (state) => {
    if (!state.undo.length) return state;
    const last = state.undo[state.undo.length - 1];
    const next = { ...patch(state, last), undo: state.undo.slice(0, -1) };
    const keepFingering = state.mode.type === 'fingering' && state.mode.b < last.events.length;
    return keepFingering ? next : to(next, ADDING);
  },
};

const MODES = {
  adding: {
    TAP_FRET: (state, a) => tapFret(state, a, false),
    SELECT_COLUMN: selectColumn,
    INSERT_REST: (state) => insert(state, restEvent()),
    INSERT_BAR: (state) => insert(state, barEvent()),
    DELETE: deleteAtCursor,
    MOVE_CURSOR: moveCursor,
    NUDGE_FRET: nudgeFret,
    ENTER_FINGERING: enterFingering,
  },
  picking: {
    CHOOSE_FINGER: (state, { finger }) => {
      const { s, f, replace } = state.mode;
      return replace ? replaceAtCursor(state, s, f, finger) : insert(state, noteEvent(s, f, finger));
    },
    CANCEL: (state) => to(state, state.mode.replace ? { type: 'editing' } : ADDING),
    TAP_FRET: (state, a) => tapFret(state, a, state.mode.replace),
    SELECT_COLUMN: selectColumn,
  },
  editing: {
    TAP_FRET: (state, a) => tapFret(state, a, true),
    SET_FINGER: (state, { finger }) => to(setLeadFinger(state, currentSheet(state).cursor, finger), ADDING),
    SELECT_COLUMN: selectColumn,
    DONE: (state) => to(state, ADDING),
    DELETE: deleteAtCursor,
    NUDGE_FRET: nudgeFret,
    MOVE_CURSOR: moveCursor,
    INSERT_REST: (state) => insert(state, restEvent()),
    INSERT_BAR: (state) => insert(state, barEvent()),
    ENTER_FINGERING: enterFingering,
  },
  fingering: {
    // like a date-range picker: with one note selected, tapping another selects the run between them
    SELECT_COLUMN: (state, { i, extend }) =>
      fxSelect(state, i, extend || (state.mode.a === state.mode.b && i !== state.mode.a)),
    STEP: (state, { d, extend }) => {
      const j = stepToNote(currentSheet(state).events, d > 0 ? state.mode.b : state.mode.a, d);
      return j < 0 ? state : fxSelect(state, j, extend);
    },
    SHIFT_HAND: (state, { d }) => fxFit(state, state.mode.pos + d),
    FIT: (state) => fxFit(state, state.mode.pos),
    TAP_FRET: fxTapFret,
    SET_FINGER: fxSetFinger,
    EXIT: (state) => to(patch(state, { cursor: state.mode.b }), ADDING),
  },
};

export function editorReducer(state, action) {
  const handler = GLOBAL[action.type] ?? MODES[state.mode.type][action.type];
  return handler ? handler(state, action) : state;
}

/** Whether the current mode accepts an action type (for enabling controls and key handling). */
export const accepts = (state, type) => Boolean(GLOBAL[type] ?? MODES[state.mode.type][type]);

export function createEditorState(saved) {
  const sheets = saved?.sheets?.length ? saved.sheets : [sampleSheet()];
  const currentId = sheets.some((s) => s.id === saved?.currentId) ? saved.currentId : sheets[0].id;
  return {
    doc: { sheets, currentId },
    settings: { loop: true, click: true, showScale: true, ...saved?.settings },
    mode: ADDING,
    undo: [],
  };
}
