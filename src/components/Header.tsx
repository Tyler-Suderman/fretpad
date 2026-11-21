import type { ChangeEvent, Dispatch } from 'react';
import type { Sheet } from '../music/types.ts';
import type { Action } from '../state/editor.ts';

const NEW_SHEET = '__new';

interface Props {
  sheets: Sheet[];
  sheet: Sheet;
  dispatch: Dispatch<Action>;
  onExport: () => void;
}

export default function Header({ sheets, sheet, dispatch, onExport }: Props) {
  const onPickSheet = (e: ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === NEW_SHEET) dispatch({ type: 'NEW_SHEET' });
    else dispatch({ type: 'SWITCH_SHEET', id: e.target.value });
  };
  return (
    <header>
      <h1 className="brand">
        Fret<span>pad</span>
      </h1>
      <input
        id="title"
        aria-label="Sheet title"
        maxLength={80}
        value={sheet.title}
        onChange={(e) => dispatch({ type: 'RENAME', title: e.target.value })}
      />
      <div className="hgroup">
        <select id="sheetSel" aria-label="Choose a sheet" value={sheet.id} onChange={onPickSheet}>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title || 'Untitled'}
            </option>
          ))}
          <option value={NEW_SHEET}>+ New sheet</option>
        </select>
        <button className="btn" onClick={onExport}>
          Export
        </button>
      </div>
    </header>
  );
}
