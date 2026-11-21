import { useEffect, useEffectEvent, useReducer, useState } from 'react';
import { usePlayback } from './audio/usePlayback.ts';
import ExportDialog from './components/ExportDialog.tsx';
import Fretboard from './components/Fretboard.tsx';
import Header from './components/Header.tsx';
import ModePanel from './components/ModePanel.tsx';
import Staff from './components/Staff.tsx';
import Transport from './components/Transport.tsx';
import { leadNote } from './music/tab.ts';
import { midiAt, midiOf } from './music/theory.ts';
import { accepts, createEditorState, currentSheet, editorReducer } from './state/editor.ts';
import { keyToAction } from './state/keymap.ts';
import { loadSaved, save } from './state/storage.ts';
import { fretboardView, staffView } from './state/views.ts';
import './styles.css';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('input, textarea, select');

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => createEditorState(loadSaved()));
  const [exportOpen, setExportOpen] = useState(false);
  const { doc, settings, mode } = state;
  const sheet = currentSheet(state);
  const playback = usePlayback(sheet, settings);
  const { stop } = playback;

  useEffect(() => save({ doc, settings }), [doc, settings]);
  useEffect(() => stop(), [doc.currentId, stop]); // a different sheet stops playback

  function togglePlay() {
    if (playback.playing) return playback.stop();
    if (mode.type === 'fingering') return playback.start({ range: { a: mode.a, b: mode.b } });
    const from = sheet.cursor >= 0 && sheet.cursor < sheet.events.length - 1 ? sheet.cursor : 0;
    playback.start({ from });
  }

  // Sound is a side effect of input, so it lives here rather than in the reducer.
  function tapFret(s: number, f: number) {
    playback.preview(midiAt(s, f));
    dispatch({ type: 'TAP_FRET', s, f });
  }

  function selectColumn(i: number, extend = false) {
    const note = leadNote(sheet.events[i]);
    if (note && !extend) playback.preview(midiOf(note));
    dispatch({ type: 'SELECT_COLUMN', i, extend });
  }

  // Keyboard: an effect event always sees current state without re-subscribing.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    if (exportOpen) {
      if (e.key === 'Escape') setExportOpen(false);
      return;
    }
    const command = keyToAction(e, mode);
    if (!command) return;
    e.preventDefault();
    if (command.type === 'TOGGLE_PLAY') return togglePlay();
    if (!accepts(state, command.type)) return;
    if (command.type === 'NUDGE_FRET') {
      const n = leadNote(sheet.events[sheet.cursor]);
      if (n) playback.preview(midiOf(n) + command.d);
    }
    dispatch(command);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={mode.type === 'fingering' ? 'app fingering' : 'app'}>
      <Header sheets={doc.sheets} sheet={sheet} dispatch={dispatch} onExport={() => setExportOpen(true)} />
      <Transport sheet={sheet} settings={settings} playing={playback.playing} onTogglePlay={togglePlay} dispatch={dispatch} />
      <Staff view={staffView(state, playback.playingIndex)} onSelect={selectColumn} />
      <ModePanel
        mode={mode}
        sheet={sheet}
        canUndo={state.undo.length > 0}
        playing={playback.playing}
        onPlayRange={togglePlay}
        dispatch={dispatch}
      />
      <Fretboard view={fretboardView(state, playback.playingIndex)} onTap={tapFret} />
      {exportOpen && (
        <ExportDialog
          sheet={sheet}
          onClose={() => setExportOpen(false)}
          onDeleteSheet={() => {
            dispatch({ type: 'DELETE_SHEET' });
            setExportOpen(false);
          }}
        />
      )}
    </div>
  );
}
