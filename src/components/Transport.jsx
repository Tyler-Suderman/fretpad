import { MODES, ROOTS } from '../music/theory.js';
import { hasNotes } from '../music/tab.js';

const DIVISIONS = [
  { value: 4, label: 'Each column = ♩ quarter' },
  { value: 8, label: 'Each column = ♪ eighth' },
  { value: 16, label: 'Each column = 16th' },
];

function Toggle({ on, onClick, children, ...rest }) {
  return (
    <button className="btn toggle" aria-pressed={on} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}

export default function Transport({ sheet, settings, playing, onTogglePlay, dispatch }) {
  const toggle = (setting) => () => dispatch({ type: 'TOGGLE', setting });
  const setKey = (key) => dispatch({ type: 'SET_KEY', key });

  return (
    <div className="transport">
      <button
        className="btn primary playbtn"
        onClick={onTogglePlay}
        disabled={!hasNotes(sheet.events)}
        title={playing ? 'Stop (Space)' : 'Play (Space). Starts from the selected column.'}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          {playing ? <rect x="1" y="1" width="10" height="10" rx="1.5" /> : <path d="M2 1l9 5-9 5z" />}
        </svg>
        {playing ? 'Stop' : 'Play'}
      </button>

      <div className="tempo">
        <button className="btn sq" aria-label="Slower" onClick={() => dispatch({ type: 'SET_TEMPO', bpm: sheet.bpm - 5 })}>
          −
        </button>
        <label htmlFor="bpm">
          <TempoInput key={sheet.id + sheet.bpm} bpm={sheet.bpm} onCommit={(bpm) => dispatch({ type: 'SET_TEMPO', bpm })} />
          BPM
        </label>
        <button className="btn sq" aria-label="Faster" onClick={() => dispatch({ type: 'SET_TEMPO', bpm: sheet.bpm + 5 })}>
          +
        </button>
      </div>

      <select
        id="div"
        aria-label="Note value of each column"
        value={sheet.div}
        onChange={(e) => dispatch({ type: 'SET_DIVISION', div: Number(e.target.value) })}
      >
        {DIVISIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <Toggle on={settings.loop} onClick={toggle('loop')}>
        Loop
      </Toggle>
      <Toggle on={settings.click} onClick={toggle('click')}>
        Click
      </Toggle>

      <div className="keyctl" role="group" aria-label="Key">
        <select
          id="keyRoot"
          aria-label="Key root"
          value={sheet.key ? sheet.key.root : ''}
          onChange={(e) =>
            setKey(e.target.value === '' ? null : { root: Number(e.target.value), mode: sheet.key?.mode ?? 0 })
          }
        >
          <option value="">No key</option>
          {ROOTS.map((r, i) => (
            <option key={r} value={i}>
              Key of {r}
            </option>
          ))}
        </select>
        <select
          id="keyMode"
          aria-label="Mode"
          disabled={!sheet.key}
          value={sheet.key?.mode ?? 0}
          onChange={(e) => setKey({ ...sheet.key, mode: Number(e.target.value) })}
        >
          {MODES.map((m, i) => (
            <option key={m.name} value={i}>
              {m.name}
            </option>
          ))}
        </select>
        <Toggle on={settings.showScale} onClick={toggle('showScale')} disabled={!sheet.key} title="Show the scale on the fretboard">
          Scale
        </Toggle>
      </div>
    </div>
  );
}

/** Lets you type freely; commits on blur or Enter. Remounted (via key) when the tempo changes elsewhere. */
function TempoInput({ bpm, onCommit }) {
  return (
    <input
      id="bpm"
      type="number"
      min={30}
      max={260}
      inputMode="numeric"
      defaultValue={bpm}
      onBlur={(e) => onCommit(Number(e.target.value))}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
