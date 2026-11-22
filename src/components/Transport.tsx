import type { Dispatch } from 'react';
import { hasNotes, sectionRange } from '../music/tab.ts';
import type { Sheet } from '../music/types.ts';
import type { Action, Settings } from '../state/editor.ts';
import Toggle from './Toggle.tsx';

interface Props {
  sheet: Sheet;
  settings: Settings;
  playing: boolean;
  onTogglePlay: () => void;
  dispatch: Dispatch<Action>;
}

export default function Transport({ sheet, settings, playing, onTogglePlay, dispatch }: Props) {
  const toggle = (setting: keyof Settings) => () => dispatch({ type: 'TOGGLE', setting });
  const hasSection = sectionRange(sheet) !== null;

  return (
    <div className="transport">
      <button
        className="btn primary playbtn"
        onClick={onTogglePlay}
        disabled={!hasNotes(sheet.events)}
        title={playing ? 'Stop (Space)' : hasSection ? 'Play the loop section (Space)' : 'Play (Space). Starts from the selected column.'}
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
          <TempoInput
            key={`${sheet.id}-${sheet.bpm}`}
            bpm={sheet.bpm}
            onCommit={(bpm) => dispatch({ type: 'SET_TEMPO', bpm })}
          />
          BPM
        </label>
        <button className="btn sq" aria-label="Faster" onClick={() => dispatch({ type: 'SET_TEMPO', bpm: sheet.bpm + 5 })}>
          +
        </button>
      </div>

      <Toggle on={settings.click} onClick={toggle('click')}>
        Click
      </Toggle>
      <div className="sectionctl" role="group" aria-label="Loop">
        <Toggle on={settings.loop} onClick={toggle('loop')} title="Repeat when playback reaches the end">
          Loop
        </Toggle>
        <button
          className="btn sq"
          aria-label="Loop section starts here"
          title="Start the loop section at the selected column ([)"
          disabled={sheet.cursor < 0}
          onClick={() => dispatch({ type: 'SET_SECTION_START' })}
        >
          [
        </button>
        <button
          className="btn sq"
          aria-label="Loop section ends here"
          title="End the loop section at the selected column (])"
          disabled={sheet.cursor < 0}
          onClick={() => dispatch({ type: 'SET_SECTION_END' })}
        >
          ]
        </button>
        {hasSection && (
          <button
            className="btn sq"
            aria-label="Clear loop section"
            title="Clear the loop section and play the whole sheet"
            onClick={() => dispatch({ type: 'CLEAR_SECTION' })}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/** Lets you type freely; commits on blur or Enter. Remounted (via key) when the tempo changes elsewhere. */
function TempoInput({ bpm, onCommit }: { bpm: number; onCommit: (bpm: number) => void }) {
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
