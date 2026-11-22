// Persists sheets and settings to localStorage. Reads the prototype's format too.
import { newSheet } from '../music/tab.ts';
import type { Column, Sheet } from '../music/types.ts';
import type { EditorState, SavedEditor, Settings } from './editor.ts';

const STORAGE_KEY = 'fretpad.v1';
/** 3: loop section edges can be open (null). */
const VERSION = 3;

/** Stored JSON is untrusted: older formats and hand edits are possible. */
type StoredColumn = Omit<Column, 'kind'> & { kind: Column['kind'] | 'gap' };
type StoredSheet = Partial<Omit<Sheet, 'events'>> & { events?: StoredColumn[] };

interface StoredV2 {
  version: number;
  sheets: StoredSheet[];
  currentId?: string;
  settings?: Partial<Settings>;
}

/** The prototype kept settings at the top level and called the current sheet `current`. */
interface StoredLegacy extends Partial<Settings> {
  version?: undefined;
  sheets: StoredSheet[];
  current?: string;
}

/**
 * Before version 3 a section always stored both edges, filling an unset one with the sheet's first or last
 * column. Reopen edges that sit there, so those sections grow with the sheet like new ones.
 */
function reopenSection(sheet: Sheet): Sheet {
  const { section, events } = sheet;
  if (!section) return sheet;
  return {
    ...sheet,
    section: {
      from: section.from === events[0]?.id ? null : section.from,
      to: section.to === events[events.length - 1]?.id ? null : section.to,
    },
  };
}

function normalizeSheet(raw: StoredSheet, version: number): Sheet {
  const events = (raw.events ?? []).map((ev) => (ev.kind === 'gap' ? { ...ev, kind: 'rest' } : ev)) as Column[];
  const sheet: Sheet = { ...newSheet(), ...raw, events };
  return version < 3 ? reopenSection(sheet) : sheet;
}

/** Parse stored JSON into a SavedEditor, or null. Exported for tests. */
export function parseSaved(json: string | null): SavedEditor | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as StoredV2 | StoredLegacy;
    if (!Array.isArray(raw?.sheets)) return null;
    const sheets = raw.sheets.map((s) => normalizeSheet(s, raw.version ?? 1));
    if (raw.version === undefined) {
      return {
        sheets,
        currentId: raw.current,
        settings: { loop: raw.loop ?? true, click: raw.click ?? true, showScale: raw.showScale ?? true },
      };
    }
    return { sheets, currentId: raw.currentId, settings: raw.settings };
  } catch {
    return null;
  }
}

export function loadSaved(): SavedEditor | null {
  try {
    return parseSaved(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null; // storage blocked (private mode, sandboxed preview)
  }
}

/** Saves everything except an untouched preset (see EditorState.untouched). */
export function save(state: Pick<EditorState, 'doc' | 'settings' | 'untouched'>): void {
  try {
    const sheets = state.doc.sheets.filter((s) => s.id !== state.untouched);
    const currentId = state.doc.currentId === state.untouched ? sheets[0]?.id : state.doc.currentId;
    const stored: StoredV2 = { version: VERSION, sheets, currentId, settings: state.settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage full or blocked: the app keeps working for this session
  }
}
