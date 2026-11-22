// The editor as a small state machine, used with React's useReducer.
//
// Modes (state.mode.type):
//   adding     tapping a fret adds a note after the cursor
//   picking    a fret was tapped; waiting for a finger   { s, f, replace, suggest }
//   editing    a placed note/rest is selected; a fret tap replaces it, a finger changes it
//
// Each mode lists the actions it accepts, and its handlers receive state narrowed to that mode.
// An action a mode does not list is ignored, so UI states can't leak into each other.
// GLOBAL actions work in every mode.
import type { PlaybackSettings } from '../audio/player.ts';
import { suggestFinger } from '../music/fingering.ts';
import { presetSheet } from '../music/presets.ts';
import type { PresetId } from '../music/presets.ts';
import {
  isNotes,
  isReplaceable,
  leadNote,
  newSheet,
  noteEvent,
  restEvent,
  sectionRange,
} from '../music/tab.ts';
import { FRETS, OPEN } from '../music/theory.ts';
import type { Column, Division, Finger, FingeringSystem, Key, Note, Sheet } from '../music/types.ts';

/* ---------- types ---------- */

export type Mode =
  | { type: 'adding' }
  | { type: 'picking'; s: number; f: number; replace: boolean; suggest: Finger }
  | { type: 'editing' };
export type ModeType = Mode['type'];

export interface Settings extends PlaybackSettings {
  showScale: boolean;
  /** Faint measure lines in the tab (4/4: every `div` columns). */
  showMeasures: boolean;
}

interface UndoStep {
  events: Column[];
  cursor: number;
}

export interface EditorState {
  doc: { sheets: Sheet[]; currentId: string };
  settings: Settings;
  mode: Mode;
  undo: UndoStep[];
  /**
   * A preset sheet opened but not changed yet. It isn't saved, and it's dropped when you move to another
   * sheet, so browsing presets doesn't pile up copies. Any change to its content keeps it for good.
   */
  untouched: string | null;
}

type Step = 1 | -1;

export type Action =
  // global
  | { type: 'SWITCH_SHEET'; id: string }
  | { type: 'NEW_SHEET'; preset?: PresetId }
  | { type: 'DELETE_SHEET' }
  | { type: 'RENAME'; title: string }
  | { type: 'SET_TEMPO'; bpm: number }
  | { type: 'SET_DIVISION'; div: Division }
  | { type: 'SET_KEY'; key: Key | null }
  | { type: 'SET_SYSTEM'; system: FingeringSystem }
  | { type: 'TOGGLE'; setting: keyof Settings }
  | { type: 'UNDO' }
  | { type: 'CLEAR_SECTION' }
  // writing
  | { type: 'TAP_FRET'; s: number; f: number }
  | { type: 'SELECT_COLUMN'; i: number; extend?: boolean }
  | { type: 'INSERT_REST' }
  | { type: 'DELETE' }
  | { type: 'MOVE_CURSOR'; d: Step }
  | { type: 'NUDGE_FRET'; d: Step }
  | { type: 'SET_SECTION_START' }
  | { type: 'SET_SECTION_END' }
  | { type: 'CHOOSE_FINGER'; finger: Finger }
  | { type: 'ACCEPT_SUGGESTION' }
  | { type: 'CANCEL' }
  | { type: 'SET_FINGER'; finger: Finger }
  | { type: 'DONE' };
export type ActionType = Action['type'];

type ActionOf<T extends ActionType> = Extract<Action, { type: T }>;
type ModeOf<M extends ModeType> = Extract<Mode, { type: M }>;
/** Editor state while in mode M. */
type In<M extends ModeType> = EditorState & { mode: ModeOf<M> };

type Handlers<S> = { [T in ActionType]?: (state: S, action: ActionOf<T>) => EditorState };

/* ---------- state helpers ---------- */

const MAX_UNDO = 100;
export const ADDING: Mode = { type: 'adding' };

export function currentSheet(state: EditorState): Sheet {
  const sheet = state.doc.sheets.find((s) => s.id === state.doc.currentId) ?? state.doc.sheets[0];
  if (!sheet) throw new Error('Editor state has no sheets');
  return sheet;
}

const replaceSheet = (state: EditorState, sheet: Sheet): EditorState => ({
  ...state,
  doc: { ...state.doc, sheets: state.doc.sheets.map((s) => (s.id === sheet.id ? sheet : s)) },
});

/** Change sheet fields without an undo step (title, tempo, cursor…). */
const patch = (state: EditorState, fields: Partial<Sheet>): EditorState =>
  replaceSheet(state, { ...currentSheet(state), ...fields });

/** Undoable edit: `fn` mutates a draft copy of the current sheet. */
function change(state: EditorState, fn: (draft: Sheet) => void): EditorState {
  const sheet = currentSheet(state);
  const draft = structuredClone(sheet);
  fn(draft);
  const undo = [...state.undo, { events: sheet.events, cursor: sheet.cursor }].slice(-MAX_UNDO);
  return { ...replaceSheet(state, draft), undo };
}

const to = (state: EditorState, mode: Mode): EditorState => ({ ...state, mode });

/** Replace the lead note of note column i in a draft (no-op if i isn't a note column). */
function setLead(draft: Sheet, i: number, note: Note): void {
  const col = draft.events[i];
  if (isNotes(col)) col.notes[0] = note;
}

/* ---------- shared edits ---------- */

const insert = (state: EditorState, ev: Column): EditorState =>
  to(
    change(state, (d) => {
      d.events.splice(d.cursor + 1, 0, ev);
      d.cursor += 1;
    }),
    ADDING,
  );

function replaceAtCursor(state: EditorState, s: number, f: number, finger: Finger): EditorState {
  return to(
    change(state, (d) => {
      const old = d.events[d.cursor];
      if (old) d.events[d.cursor] = { ...noteEvent(s, f, finger), id: old.id };
    }),
    ADDING,
  );
}

function setLeadFinger(state: EditorState, i: number, finger: Finger): EditorState {
  const n = leadNote(currentSheet(state).events[i]);
  if (!n || n.f === 0) return state;
  return change(state, (d) => setLead(d, i, { ...n, finger }));
}

function deleteAtCursor(state: EditorState): EditorState {
  if (currentSheet(state).cursor < 0) return state;
  return to(
    change(state, (d) => {
      d.events.splice(d.cursor, 1);
      d.cursor = Math.max(-1, d.cursor - 1);
    }),
    ADDING,
  );
}

function moveCursor(state: EditorState, { d }: ActionOf<'MOVE_CURSOR'>): EditorState {
  const sheet = currentSheet(state);
  return to(patch(state, { cursor: Math.max(-1, Math.min(sheet.events.length - 1, sheet.cursor + d)) }), ADDING);
}

function nudgeFret(state: EditorState, { d }: ActionOf<'NUDGE_FRET'>): EditorState {
  const sheet = currentSheet(state);
  const n = leadNote(sheet.events[sheet.cursor]);
  if (!n || n.f + d < 0 || n.f + d > FRETS) return state;
  const f = n.f + d;
  const finger: Finger = f === 0 ? OPEN : n.finger === OPEN ? '' : n.finger;
  return change(state, (draft) => setLead(draft, draft.cursor, { ...n, f, finger }));
}

function selectColumn(state: EditorState, { i }: ActionOf<'SELECT_COLUMN'>): EditorState {
  const sheet = currentSheet(state);
  const tappedAgain = state.mode.type === 'editing' && sheet.cursor === i;
  const editable = isReplaceable(sheet.events[i]) && !tappedAgain;
  return to(patch(state, { cursor: i }), editable ? { type: 'editing' } : ADDING);
}

/** Up to four notes just before the new note: the cursor column and before when inserting, before it when replacing. */
function notesBefore(sheet: Sheet, replace: boolean): Note[] {
  const out: Note[] = [];
  for (let i = replace ? sheet.cursor - 1 : sheet.cursor; i >= 0 && out.length < 4; i--) {
    const n = leadNote(sheet.events[i]);
    if (n) out.push(n);
  }
  return out;
}

function tapFret(state: EditorState, { s, f }: ActionOf<'TAP_FRET'>, replace: boolean): EditorState {
  if (f === 0) return replace ? replaceAtCursor(state, s, 0, OPEN) : insert(state, noteEvent(s, 0, OPEN));
  const sheet = currentSheet(state);
  const suggest = suggestFinger({ s, f }, notesBefore(sheet, replace), sheet.key, sheet.system ?? 'perFret');
  return to(state, { type: 'picking', s, f, replace, suggest });
}

/**
 * Pin one edge of the loop section to column i. An edge never set stays open (the sheet's start or end, so the
 * section grows as notes are added past it); a pinned edge crossed by the new one is reopened. Setting the end
 * on the last column (or the start on the first) leaves that edge open too: "to the end" is what that means.
 */
function setSectionEdge(state: EditorState, edge: 'start' | 'end', i: number): EditorState {
  const sheet = currentSheet(state);
  const { events } = sheet;
  const here = events[i];
  if (!here) return state;
  const cur = sectionRange(sheet) ? (sheet.section ?? null) : null;
  let from = cur?.from ?? null;
  let to = cur?.to ?? null;
  const at = (id: string) => events.findIndex((e) => e.id === id);
  if (edge === 'start') {
    from = i === 0 ? null : here.id;
    if (to !== null && at(to) < i) to = null;
  } else {
    to = i === events.length - 1 ? null : here.id;
    if (from !== null && at(from) > i) from = null;
  }
  return patch(state, { section: { from, to } });
}

const sectionAtCursor = (edge: 'start' | 'end') => (state: EditorState) =>
  setSectionEdge(state, edge, currentSheet(state).cursor);

/* ---------- the machine ---------- */

const GLOBAL: Handlers<EditorState> = {
  SWITCH_SHEET: (state, { id }) => ({ ...state, doc: { ...state.doc, currentId: id }, mode: ADDING, undo: [] }),
  NEW_SHEET: (state, { preset }) => {
    const sheet = preset ? presetSheet(preset) : newSheet();
    return {
      ...state,
      doc: { sheets: [sheet, ...state.doc.sheets], currentId: sheet.id },
      mode: ADDING,
      undo: [],
      untouched: preset ? sheet.id : null,
    };
  },
  DELETE_SHEET: (state) => {
    const rest = state.doc.sheets.filter((s) => s.id !== state.doc.currentId);
    const [first, ...others] = rest.length ? rest : [newSheet()];
    return { ...state, doc: { sheets: [first!, ...others], currentId: first!.id }, mode: ADDING, undo: [] };
  },
  RENAME: (state, { title }) => patch(state, { title }),
  CLEAR_SECTION: (state) => patch(state, { section: null }),
  SET_TEMPO: (state, { bpm }) =>
    patch(state, { bpm: Math.max(30, Math.min(260, Math.round(bpm) || currentSheet(state).bpm)) }),
  SET_DIVISION: (state, { div }) => patch(state, { div }),
  SET_KEY: (state, { key }) => patch(state, { key }),
  SET_SYSTEM: (state, { system }) => patch(state, { system }),
  TOGGLE: (state, { setting }) => ({ ...state, settings: { ...state.settings, [setting]: !state.settings[setting] } }),
  UNDO: (state) => {
    const last = state.undo[state.undo.length - 1];
    if (!last) return state;
    return to({ ...patch(state, last), undo: state.undo.slice(0, -1) }, ADDING);
  },
};

const MODES: { [M in ModeType]: Handlers<In<M>> } = {
  adding: {
    TAP_FRET: (state, a) => tapFret(state, a, false),
    SELECT_COLUMN: selectColumn,
    INSERT_REST: (state) => insert(state, restEvent()),
    DELETE: deleteAtCursor,
    MOVE_CURSOR: moveCursor,
    NUDGE_FRET: nudgeFret,
    SET_SECTION_START: sectionAtCursor('start'),
    SET_SECTION_END: sectionAtCursor('end'),
  },
  picking: {
    CHOOSE_FINGER: (state, { finger }) => {
      const { s, f, replace } = state.mode;
      return replace ? replaceAtCursor(state, s, f, finger) : insert(state, noteEvent(s, f, finger));
    },
    ACCEPT_SUGGESTION: (state) => {
      const { s, f, replace, suggest } = state.mode;
      return replace ? replaceAtCursor(state, s, f, suggest) : insert(state, noteEvent(s, f, suggest));
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
    SET_SECTION_START: sectionAtCursor('start'),
    SET_SECTION_END: sectionAtCursor('end'),
  },
};

type AnyHandler = (state: EditorState, action: Action) => EditorState;

/** Look up the handler for an action in the current mode. */
function handlerFor(state: EditorState, type: ActionType): AnyHandler | undefined {
  // TypeScript can't correlate state.mode.type with the handler table's mode key, so the lookup is
  // widened here once. Each table entry above is checked against its own mode and action types.
  const table = MODES[state.mode.type] as Handlers<EditorState>;
  return (GLOBAL[type] ?? table[type]) as AnyHandler | undefined;
}

/** What counts as changing a sheet: anything but the cursor (selecting notes isn't a change). */
const CONTENT = ['events', 'title', 'bpm', 'div', 'key', 'section', 'system'] as const;
const sameContent = (a: Sheet, b: Sheet): boolean => CONTENT.every((k) => a[k] === b[k]);

/** Keep an untouched preset only while it's open and unchanged. */
function settleUntouched(prev: EditorState, next: EditorState): EditorState {
  const id = prev.untouched;
  if (!id || next.untouched !== id) return next; // nothing pending, or a new preset replaced it
  const before = prev.doc.sheets.find((s) => s.id === id);
  const after = next.doc.sheets.find((s) => s.id === id);
  if (!before || !after) return { ...next, untouched: null }; // deleted
  if (!sameContent(before, after)) return { ...next, untouched: null }; // changed: keep it
  if (next.doc.currentId === id) return next; // still open, still unchanged
  // moved to another sheet without changing it: drop it
  return { ...next, doc: { ...next.doc, sheets: next.doc.sheets.filter((s) => s.id !== id) }, untouched: null };
}

export function editorReducer(state: EditorState, action: Action): EditorState {
  const handler = handlerFor(state, action.type);
  if (!handler) return state;
  const next = handler(state, action);
  if (!state.untouched) return next;
  // a new preset replacing an unchanged one: drop the old one now
  if (next.untouched && next.untouched !== state.untouched) {
    const old = state.doc.sheets.find((s) => s.id === state.untouched);
    const kept = old && next.doc.sheets.find((s) => s.id === old.id);
    if (old && kept && sameContent(old, kept)) {
      return { ...next, doc: { ...next.doc, sheets: next.doc.sheets.filter((s) => s.id !== old.id) } };
    }
    return next;
  }
  return settleUntouched(state, next);
}

/** Whether the current mode accepts an action type (for enabling controls and key handling). */
export const accepts = (state: EditorState, type: ActionType): boolean => handlerFor(state, type) !== undefined;

export interface SavedEditor {
  sheets: Sheet[];
  currentId?: string;
  settings?: Partial<Settings>;
}

export function createEditorState(saved: SavedEditor | null): EditorState {
  const fresh = !saved?.sheets.length;
  const sheets = fresh ? [presetSheet('c-major')] : saved.sheets;
  const first = sheets[0]!;
  const currentId = sheets.some((s) => s.id === saved?.currentId) ? saved!.currentId! : first.id;
  return {
    doc: { sheets, currentId },
    settings: { loop: true, click: true, showScale: true, showMeasures: true, ...saved?.settings },
    mode: ADDING,
    undo: [],
    untouched: fresh ? first.id : null,
  };
}
