import type { ChangeEvent, Dispatch, ReactNode } from 'react';
import { PRESETS } from '../music/presets.ts';
import type { PresetId } from '../music/presets.ts';
import type { Sheet } from '../music/types.ts';
import type { Action } from '../state/editor.ts';

const MENU = '';
const NEW_SHEET = '__new';
const DELETE_SHEET = '__delete';
const PRESET = '__preset:';

interface Props {
  sheets: Sheet[];
  sheet: Sheet;
  dispatch: Dispatch<Action>;
  onExport: () => void;
  /** Sheet-setup summary, e.g. "A Dorian · ♪ eighths", shown under the title while setup is closed. */
  setupSummary: string;
  /** The setup controls, shown in the summary's place while open (null when closed). */
  setup: ReactNode;
  onToggleSetup: () => void;
}

export default function Header({ sheets, sheet, dispatch, onExport, setupSummary, setup, onToggleSetup }: Props) {
  // A menu, not a picker: it always shows "Sheets" (the title field already names the current sheet).
  const onMenu = (e: ChangeEvent<HTMLSelectElement>) => {
    const choice = e.target.value;
    if (choice === NEW_SHEET) dispatch({ type: 'NEW_SHEET' });
    else if (choice.startsWith(PRESET)) dispatch({ type: 'NEW_SHEET', preset: choice.slice(PRESET.length) as PresetId });
    else if (choice === DELETE_SHEET) {
      // deleting a sheet clears its undo history, so ask first
      if (window.confirm(`Delete "${sheet.title || 'Untitled'}"? This can't be undone.`)) dispatch({ type: 'DELETE_SHEET' });
    } else if (choice !== sheet.id) dispatch({ type: 'SWITCH_SHEET', id: choice });
  };
  return (
    <header>
      <h1 className="brand">
        Fret<span>pad</span>
      </h1>
      <div className="titleblock">
        <input
          id="title"
          aria-label="Sheet title"
          maxLength={80}
          value={sheet.title}
          onChange={(e) => dispatch({ type: 'RENAME', title: e.target.value })}
        />
        {setup ? (
          <div className="subtitle">
            {setup}
            <button className="setupchip fold" aria-expanded aria-controls="setup" aria-label="Hide sheet setup" title="Done" onClick={onToggleSetup} />
          </div>
        ) : (
          <button
            className="setupchip"
            aria-expanded={false}
            title="Change key, mode and note value"
            onClick={onToggleSetup}
          >
            {setupSummary}
          </button>
        )}
      </div>
      <div className="hgroup">
        <select id="sheetSel" aria-label="Sheets" value={MENU} onChange={onMenu}>
          <option value={MENU} disabled hidden>
            Sheets
          </option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id === sheet.id ? '✓ ' : ' '}
              {s.title || 'Untitled'}
            </option>
          ))}
          <option disabled>──────────</option>
          <option value={NEW_SHEET}>+ New sheet</option>
          <optgroup label="New from a preset">
            {PRESETS.map((p) => (
              <option key={p.id} value={PRESET + p.id}>
                + {p.title}
              </option>
            ))}
          </optgroup>
          <option value={DELETE_SHEET}>Delete this sheet…</option>
        </select>
        <button className="btn" onClick={onExport}>
          Export
        </button>
      </div>
    </header>
  );
}
