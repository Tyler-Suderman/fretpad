import { useEffect, useEffectEvent, useReducer, useState } from 'react';
import { usePlayback } from './audio/usePlayback.ts';
import ExportDialog from './components/ExportDialog.tsx';
import Fretboard from './components/Fretboard.tsx';
import Header from './components/Header.tsx';
import SetupBar from './components/SetupBar.tsx';
import ModePanel from './components/ModePanel.tsx';
import Staff from './components/Staff.tsx';
import Transport from './components/Transport.tsx';
import { leadNote, sectionRange } from './music/tab.ts';
import { midiAt, midiOf } from './music/theory.ts';
import { accepts, createEditorState, currentSheet, editorReducer } from './state/editor.ts';
import { keyToAction } from './state/keymap.ts';
import { loadSaved, save } from './state/storage.ts';
import { fretboardView, setupSummary, staffView } from './state/views.ts';
import './styles.css';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.matches('input, textarea, select');

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, null, () => createEditorState(loadSaved()));
  const [exportOpen, setExportOpen] = useState(false);
  const { doc, settings, mode } = state;
  const sheet = currentSheet(state);
  // Setup row: open by default until the sheet has a key; an explicit open/close sticks for that sheet.
  const [setupPref, setSetupPref] = useState<{ id: string; open: boolean } | null>(null);
  const setupOpen = setupPref?.id === sheet.id ? setupPref.open : !sheet.key;
  const playback = usePlayback(sheet, settings);
  const { stop } = playback;

  useEffect(() => save({ doc, settings }), [doc, settings]);
  useEffect(() => stop(), [doc.currentId, stop]); // a different sheet stops playback

  function togglePlay() {
    if (playback.playing) return playback.stop();
    const section = sectionRange(sheet);
    if (section) return playback.start({ range: section }); // repeats when Loop is on, plays once when off
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
    // a second tap on the note being edited just moves the cursor after it, so it stays silent
    const tappedAgain = mode.type === 'editing' && sheet.cursor === i;
    if (note && !extend && !tappedAgain) playback.preview(midiOf(note));
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
    <div className="app">
      <Header
        sheets={doc.sheets}
        sheet={sheet}
        dispatch={dispatch}
        onExport={() => setExportOpen(true)}
        setupSummary={setupSummary(sheet)}
        setup={
          setupOpen && (
            <SetupBar
              sheet={sheet}
              settings={settings}
              dispatch={dispatch}
              onTouch={() => setSetupPref((p) => (p?.id === sheet.id ? p : { id: sheet.id, open: true }))}
              onDone={() => setSetupPref({ id: sheet.id, open: false })}
            />
          )
        }
        onToggleSetup={() => setSetupPref({ id: sheet.id, open: !setupOpen })}
      />
      <Transport sheet={sheet} settings={settings} playing={playback.playing} onTogglePlay={togglePlay} dispatch={dispatch} />
      <Staff view={staffView(state, playback.playingIndex)} onSelect={selectColumn} />
      <ModePanel
        mode={mode}
        sheet={sheet}
        canUndo={state.undo.length > 0}
        dispatch={dispatch}
      />
      <Fretboard view={fretboardView(state, playback.playingIndex)} onTap={tapFret} />
      {exportOpen && (
        <ExportDialog sheet={sheet} onClose={() => setExportOpen(false)} />
      )}
    </div>
  );
}
