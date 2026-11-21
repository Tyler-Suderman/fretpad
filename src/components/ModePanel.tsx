// The strip between the tab and the fretboard. One panel per editor mode.
import type { ComponentPropsWithoutRef, Dispatch, ReactNode } from 'react';
import { hasNotes, leadNote, noteIndicesBetween } from '../music/tab.ts';
import { OPEN, keyName, midiOf, noteName, scaleOf, stringLabel } from '../music/theory.ts';
import type { Sheet, Spot } from '../music/types.ts';
import type { Action, Mode } from '../state/editor.ts';
import FingerButtons from './FingerButtons.tsx';

type ModeOf<T extends Mode['type']> = Extract<Mode, { type: T }>;

interface PanelProps {
  sheet: Sheet;
  canUndo: boolean;
  playing: boolean;
  onPlayRange: () => void;
  dispatch: Dispatch<Action>;
}

const where = (n: Spot) => `${stringLabel(n.s)} string · fret ${n.f} · ${noteName(n.s, n.f)}`;

function Btn({ primary, ...rest }: { primary?: boolean } & ComponentPropsWithoutRef<'button'>) {
  return <button className={primary ? 'btn primary' : 'btn'} {...rest} />;
}

function AddingPanel({ sheet, canUndo, dispatch, editingRest = false }: PanelProps & { editingRest?: boolean }) {
  const cur = sheet.events[sheet.cursor];
  const after = editingRest ? 'Tap a fret to replace it.' : 'New notes go after it.';
  const n = leadNote(cur);
  let hint: ReactNode = 'Tap a fret to add a note.';
  if (n) {
    hint = (
      <>
        Selected: <b>{stringLabel(n.s)} string, fret {n.f}</b> ({noteName(n.s, n.f)})
        {n.finger && n.finger !== OPEN ? `, finger ${n.finger}` : ''}. {after}
      </>
    );
  } else if (cur?.kind === 'bar') hint = <>Selected: <b>bar line</b>. New notes go after it.</>;
  else if (cur?.kind === 'rest') hint = <>Selected: <b>rest</b>. {after}</>;
  else if (sheet.events.length) hint = 'Cursor is at the start. New notes go first.';

  return (
    <>
      <div className="hint">{hint}</div>
      {editingRest && (
        <Btn primary onClick={() => dispatch({ type: 'DONE' })} title="Add new notes after this one (Esc)">
          Insert after
        </Btn>
      )}
      <Btn onClick={() => dispatch({ type: 'ENTER_FINGERING' })} disabled={!hasNotes(sheet.events)} title="Re-finger a run of notes (F)">
        Fingering
      </Btn>
      <Btn onClick={() => dispatch({ type: 'INSERT_REST' })} title="Add an empty beat (R)">Rest</Btn>
      <Btn onClick={() => dispatch({ type: 'INSERT_BAR' })} title="Add a bar line (B)">Bar |</Btn>
      <Btn onClick={() => dispatch({ type: 'DELETE' })} disabled={sheet.cursor < 0} title="Delete selected (Backspace)">Delete</Btn>
      <Btn onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo} title="Undo (Ctrl/⌘ Z)">Undo</Btn>
    </>
  );
}

function PickingPanel({ mode, sheet, dispatch }: PanelProps & { mode: ModeOf<'picking'> }) {
  const had = mode.replace ? leadNote(sheet.events[sheet.cursor])?.finger : null;
  return (
    <div className="picker">
      <div className="what">
        <small>{mode.replace ? 'Change note to · which finger?' : 'Which finger?'}</small>
        {where(mode)}
      </div>
      <FingerButtons current={had} onPick={(finger) => dispatch({ type: 'CHOOSE_FINGER', finger })} />
      <button className="cancel" onClick={() => dispatch({ type: 'CANCEL' })}>
        Cancel
      </button>
    </div>
  );
}

function EditingPanel(props: PanelProps) {
  const { sheet, dispatch } = props;
  const n = leadNote(sheet.events[sheet.cursor]);
  if (!n) return <AddingPanel {...props} editingRest />; // a selected rest edits like adding
  return (
    <div className="picker">
      <div className="what">
        <small>Change finger, or tap a fret to move it</small>
        {where(n)}
      </div>
      {n.f === 0 ? (
        <span className="hint">Open string, no finger needed.</span>
      ) : (
        <FingerButtons current={n.finger} onPick={(finger) => dispatch({ type: 'SET_FINGER', finger })} />
      )}
      <Btn onClick={() => dispatch({ type: 'DELETE' })} title="Delete this note (Backspace)">Delete</Btn>
      <Btn onClick={() => dispatch({ type: 'ENTER_FINGERING' })} title="Re-finger a run of notes (F)">Fingering mode</Btn>
      <Btn primary onClick={() => dispatch({ type: 'DONE' })} title="Add new notes after this one (Esc)">Done</Btn>
    </div>
  );
}

function FingeringPanel({ mode, sheet, playing, canUndo, onPlayRange, dispatch }: PanelProps & { mode: ModeOf<'fingering'> }) {
  const { events } = sheet;
  const notes = noteIndicesBetween(events, mode.a, mode.b).flatMap((i) => leadNote(events[i]) ?? []);
  const single = mode.a === mode.b;
  const scale = scaleOf(sheet.key);
  const outside = scale ? notes.filter((n) => !scale.has(midiOf(n) % 12)).length : 0;
  const allNotes = events.flatMap((e, i) => (e.kind === 'notes' ? [i] : []));
  const lead = leadNote(events[mode.a]);
  const key = keyName(sheet.key);

  return (
    <div className="fx">
      <div className="fxrow">
        <div className="what">
          <small>Fingering mode</small>
          {single && lead ? (
            <>
              Note {allNotes.indexOf(mode.a) + 1} of {allNotes.length} · {where(lead)}
              {outside > 0 && <> · <span className="warn">outside {key}</span></>}
            </>
          ) : (
            <>
              {notes.length} notes selected{key && ` in ${key}`}
              {outside > 0 && <> · <span className="warn">{outside} outside the key</span></>}
            </>
          )}
        </div>
        <div className="posctl" role="group" aria-label="Hand position">
          <button aria-label="Move hand down one fret" onClick={() => dispatch({ type: 'SHIFT_HAND', d: -1 })}>−</button>
          <span>
            Finger 1 at fret <b>{mode.pos}</b>
          </span>
          <button aria-label="Move hand up one fret" onClick={() => dispatch({ type: 'SHIFT_HAND', d: 1 })}>+</button>
        </div>
        <Btn onClick={() => dispatch({ type: 'FIT' })} title="Move the selected notes under the hand and set fingers">Fit to hand</Btn>
        <Btn onClick={onPlayRange}>{playing ? 'Stop' : 'Play selection'}</Btn>
        <Btn onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo}>Undo</Btn>
        <Btn primary onClick={() => dispatch({ type: 'EXIT' })} title="Leave fingering mode (Esc)">Done</Btn>
      </div>

      {single && lead && (
        <div className="fxrow">
          <button className="btn sq" aria-label="Previous note" onClick={() => dispatch({ type: 'STEP', d: -1 })}>‹</button>
          {lead.f === 0 ? (
            <span className="hint">Open string, no finger needed.</span>
          ) : (
            <FingerButtons current={lead.finger} allowNone={false} onPick={(finger) => dispatch({ type: 'SET_FINGER', finger })} />
          )}
          <button className="btn sq" aria-label="Next note" onClick={() => dispatch({ type: 'STEP', d: 1 })}>›</button>
          <span className="hint">Picking a finger moves on to the next note.</span>
        </div>
      )}

      <div className="fxhelp">
        {single
          ? `Tap another note in the tab to select a run. Rings on the fretboard are the same pitch on other strings, with the finger to use there; the solid ring fits the notes around it best. Tap one to move the note there.${scale ? ' Numbered dots inside the box are the scale under your hand.' : ''}`
          : 'Use − and + to slide the hand along the neck. The notes keep their pitch, change string and fret to stay under your hand, and get one finger per fret. You can also tap a fret to put your first finger there.'}
      </div>
    </div>
  );
}

export default function ModePanel({ mode, ...props }: PanelProps & { mode: Mode }) {
  const panel = (() => {
    switch (mode.type) {
      case 'picking':
        return <PickingPanel mode={mode} {...props} />;
      case 'fingering':
        return <FingeringPanel mode={mode} {...props} />;
      case 'editing':
        return <EditingPanel {...props} />;
      case 'adding':
        return <AddingPanel {...props} />;
    }
  })();
  return <div className="strip">{panel}</div>;
}
