export default function Header({ sheets, sheet, dispatch, onExport }) {
  const onPickSheet = (e) => {
    if (e.target.value === '__new') dispatch({ type: 'NEW_SHEET' });
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
          <option value="__new">+ New sheet</option>
        </select>
        <button className="btn" onClick={onExport}>
          Export
        </button>
      </div>
    </header>
  );
}
