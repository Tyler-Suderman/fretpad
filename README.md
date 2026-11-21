# Fretpad

Write guitar practice tab by tapping the fretboard and choosing the finger you use for each note. Play it back, then re-finger runs with a hand-position tool that keeps every pitch.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run lint
npm run build    # static site in dist/
```

## Using it

- **Add notes:** tap a fret, then a finger (1–4, T, or none). Open strings go straight in.
- **Edit:** tap a note in the tab to change its finger or tap a fret to move it.
- **Fingering mode** (F): tap the first and last notes of a run, then slide the hand with − / +. Notes keep their pitch, move under your hand and get one finger per fret. Rings show the same pitch on other strings, with the best fit solid.
- **Key and mode:** shows the scale on the neck and flags notes outside the key.
- **Playback:** tempo, note value per column, loop and metronome click. Space plays.
- Sheets save in your browser's local storage. **Export** gives plain-text tab with a fingering row.

## How the code is organised

```
src/
  music/        pure domain logic, no React
    theory.js     tuning, note names, modes, scales
    fingering.js  hand position, fit a run, same-pitch alternatives
    tab.js        sheet and column model
    ascii.js      plain-text export
  audio/
    synth.js      Web Audio guitar voice (Karplus-Strong + body EQ + room)
    player.js     look-ahead playback scheduler
    usePlayback.js  the one hook that connects them to React
  state/
    editor.js     the editor state machine (useReducer)
    views.js      view models for the staff and fretboard
    keymap.js     keyboard shortcuts per mode
    storage.js    localStorage, reads the prototype's format
  components/   presentational React components
prototype/      the original single-file version, kept for reference
```

### Editor modes

The editor is a reducer with explicit modes. Each mode lists the actions it accepts; anything else is ignored.

```mermaid
stateDiagram-v2
  [*] --> adding
  adding --> picking: TAP_FRET (fretted)
  picking --> adding: CHOOSE_FINGER / CANCEL
  adding --> editing: SELECT_COLUMN (note or rest)
  editing --> picking: TAP_FRET (replace)
  editing --> adding: SET_FINGER / DONE / same note tapped
  adding --> fingering: ENTER_FINGERING
  editing --> fingering: ENTER_FINGERING
  fingering --> adding: EXIT
```

Roadmap: [TODO.md](TODO.md).
