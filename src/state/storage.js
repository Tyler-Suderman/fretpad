// Persists sheets and settings to localStorage. Reads the prototype's format too.
import { newSheet } from '../music/tab.js';

const STORAGE_KEY = 'fretpad.v1';
const VERSION = 2;

function normalizeSheet(raw) {
  return {
    ...newSheet(),
    ...raw,
    events: (raw.events ?? []).map((ev) => (ev.kind === 'gap' ? { ...ev, kind: 'rest' } : ev)),
  };
}

/** Parse stored JSON into { sheets, currentId, settings }, or null. Exported for tests. */
export function parseSaved(json) {
  if (!json) return null;
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw?.sheets)) return null;
    const legacy = raw.version === undefined; // prototype kept settings at the top level
    return {
      sheets: raw.sheets.map(normalizeSheet),
      currentId: legacy ? raw.current : raw.currentId,
      settings: legacy
        ? { loop: raw.loop ?? true, click: raw.click ?? true, showScale: raw.showScale ?? true }
        : raw.settings,
    };
  } catch {
    return null;
  }
}

export function loadSaved() {
  try {
    return parseSaved(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null; // storage blocked (private mode, sandboxed preview)
  }
}

export function save(state) {
  try {
    const { sheets, currentId } = state.doc;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, sheets, currentId, settings: state.settings }));
  } catch {
    // storage full or blocked: the app keeps working for this session
  }
}
