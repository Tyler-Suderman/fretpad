// Persists sheets and settings to localStorage. Reads the prototype's format too.
import { newSheet } from '../music/tab.ts';
import type { Column, Sheet } from '../music/types.ts';
import type { EditorState, SavedEditor, Settings } from './editor.ts';

const STORAGE_KEY = 'fretpad.v1';
const VERSION = 2;

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

function normalizeSheet(raw: StoredSheet): Sheet {
  const events = (raw.events ?? []).map((ev) => (ev.kind === 'gap' ? { ...ev, kind: 'rest' } : ev)) as Column[];
  return { ...newSheet(), ...raw, events };
}

/** Parse stored JSON into a SavedEditor, or null. Exported for tests. */
export function parseSaved(json: string | null): SavedEditor | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as StoredV2 | StoredLegacy;
    if (!Array.isArray(raw?.sheets)) return null;
    const sheets = raw.sheets.map(normalizeSheet);
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

export function save(state: Pick<EditorState, 'doc' | 'settings'>): void {
  try {
    const { sheets, currentId } = state.doc;
    const stored: StoredV2 = { version: VERSION, sheets, currentId, settings: state.settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage full or blocked: the app keeps working for this session
  }
}
