// Sheet setup that rarely changes: key, mode, note value, scale display. Shown in place of the title's subtitle when open.
import type { Dispatch } from 'react';
import { MODES, ROOTS } from '../music/theory.ts';
import type { Division, FingeringSystem, Sheet } from '../music/types.ts';
import type { Action, Settings } from '../state/editor.ts';
import { DIVISIONS } from '../state/views.ts';
import Toggle from './Toggle.tsx';

const toDivision = (value: string): Division => DIVISIONS.find((d) => String(d.value) === value)?.value ?? 8;

interface Props {
  sheet: Sheet;
  settings: Settings;
  dispatch: Dispatch<Action>;
  /** Any other setting changed: the bar stays open (setting the key must not hide it before the mode is picked). */
  onTouch: () => void;
  /** Called once the last setting (the mode) is chosen, so the bar can tuck itself away. */
  onDone: () => void;
}

export default function SetupBar({ sheet, settings, dispatch: send, onTouch, onDone }: Props) {
  const dispatch = (action: Action) => {
    onTouch();
    send(action);
  };
  const divSelect = (
    <select
      id="div"
      aria-label="Note value of each column"
      title="Note value of each column"
      value={sheet.div}
      onChange={(e) => dispatch({ type: 'SET_DIVISION', div: toDivision(e.target.value) })}
    >
      {DIVISIONS.map((d) => (
        <option key={d.value} value={d.value}>
          {d.label}
        </option>
      ))}
    </select>
  );
  return (
    <div className="setup" id="setup" role="group" aria-label="Sheet setup">
      <select
        id="keyRoot"
        aria-label="Key root"
        title="Key"
        value={sheet.key ? sheet.key.root : ''}
        onChange={(e) =>
          dispatch({
            type: 'SET_KEY',
            key: e.target.value === '' ? null : { root: Number(e.target.value), mode: sheet.key?.mode ?? 0 },
          })
        }
      >
        <option value="">No key</option>
        {ROOTS.map((r, i) => (
          <option key={r} value={i}>
            {r}
          </option>
        ))}
      </select>
      {sheet.key && (
        <select
          id="keyMode"
          aria-label="Mode"
          title="Mode"
          value={sheet.key.mode}
          onChange={(e) => {
            if (!sheet.key) return;
            send({ type: 'SET_KEY', key: { ...sheet.key, mode: Number(e.target.value) } });
            onDone();
          }}
        >
          {MODES.map((m, i) => (
            <option key={m.name} value={i}>
              {m.short}
            </option>
          ))}
        </select>
      )}
      <span className="sep" aria-hidden="true">
        ·
      </span>
      {divSelect}
      <Toggle
        on={settings.showMeasures}
        onClick={() => dispatch({ type: 'TOGGLE', setting: 'showMeasures' })}
        title="Faint measure lines in the tab (4/4)"
      >
        Measures
      </Toggle>
      <span className="sep" aria-hidden="true">
        ·
      </span>
      <select
        id="system"
        aria-label="Fingering system"
        title="How fingers are suggested when you tap a fret"
        value={sheet.system ?? 'perFret'}
        onChange={(e) => dispatch({ type: 'SET_SYSTEM', system: e.target.value as FingeringSystem })}
      >
        <option value="perFret">1 finger per fret</option>
        <option value="caged" disabled={!sheet.key}>
          CAGED{sheet.key ? '' : ' (set a key)'}
        </option>
      </select>
      {sheet.key && (
        <>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <Toggle
            on={settings.showScale}
            onClick={() => dispatch({ type: 'TOGGLE', setting: 'showScale' })}
            title="Show the scale on the fretboard"
          >
            Scale
          </Toggle>
        </>
      )}
    </div>
  );
}
