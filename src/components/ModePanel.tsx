// The strip between the tab and the fretboard. One panel per editor mode.
import type { ComponentPropsWithoutRef, Dispatch, ReactNode } from 'react';
import { leadNote } from '../music/tab.ts';
import { OPEN, noteName, stringLabel } from '../music/theory.ts';
import type { Sheet, Spot } from '../music/types.ts';
import type { Action, Mode } from '../state/editor.ts';
import FingerButtons from './FingerButtons.tsx';

type ModeOf<T extends Mode['type']> = Extract<Mode, { type: T }>;

interface PanelProps {
  sheet: Sheet;
  canUndo: boolean;
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
      <Btn onClick={() => dispatch({ type: 'INSERT_REST' })} title="Add an empty beat (R)">Rest</Btn>
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
        <small>
          {mode.replace ? 'Change note to · which finger?' : 'Which finger?'}
          {mode.suggest !== '' && mode.suggest !== OPEN && <> · Enter for {mode.suggest}</>}
        </small>
        {where(mode)}
      </div>
      <FingerButtons current={had} suggested={mode.suggest} onPick={(finger) => dispatch({ type: 'CHOOSE_FINGER', finger })} />
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
      <Btn primary onClick={() => dispatch({ type: 'DONE' })} title="Add new notes after this one (Esc)">Done</Btn>
    </div>
  );
}

export default function ModePanel({ mode, ...props }: PanelProps & { mode: Mode }) {
  const panel = (() => {
    switch (mode.type) {
      case 'picking':
        return <PickingPanel mode={mode} {...props} />;
      case 'editing':
        return <EditingPanel {...props} />;
      case 'adding':
        return <AddingPanel {...props} />;
    }
  })();
  return <div className="strip">{panel}</div>;
}
