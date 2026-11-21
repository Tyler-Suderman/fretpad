import { useEffect, useEffectEvent, useReducer, useState } from 'react';
import { usePlayback } from './audio/usePlayback.ts';
import ExportDialog from './components/ExportDialog.jsx';
import Fretboard from './components/Fretboard.jsx';
import Header from './components/Header.jsx';
import ModePanel from './components/ModePanel.jsx';
import Staff from './components/Staff.jsx';
import Transport from './components/Transport.jsx';
import { leadNote } from './music/tab.ts';
import { midiAt, midiOf } from './music/theory.ts';
import { accepts, createEditorState, currentSheet, editorReducer } from './state/editor.js';
import { keyToAction } from './state/keymap.js';
import { loadSaved, save } from './state/storage.js';
import { fretboardView, staffView } from './state/views.js';
import './styles.css';

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => createEditorState(loadSaved()));
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
  function tapFret(s, f) {
    playback.preview(midiAt(s, f));
    dispatch({ type: 'TAP_FRET', s, f });
  }

  function selectColumn(i, extend = false) {
    const note = leadNote(sheet.events[i]);
    if (note && !extend) playback.preview(midiOf(note));
    dispatch({ type: 'SELECT_COLUMN', i, extend });
  }

  // Keyboard: an effect event always sees current state without re-subscribing.
  const onKey = useEffectEvent((e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (exportOpen) {
      if (e.key === 'Escape') setExportOpen(false);
      return;
    }
    const action = keyToAction(e, mode);
    if (!action) return;
    e.preventDefault();
    if (action.type === 'TOGGLE_PLAY') return togglePlay();
    if (!accepts(state, action.type)) return;
    if (action.type === 'NUDGE_FRET') {
      const n = leadNote(sheet.events[sheet.cursor]);
      if (n) playback.preview(midiOf(n) + action.d);
    }
    dispatch(action);
  });
  useEffect(() => {
    const handler = (e) => onKey(e);
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
