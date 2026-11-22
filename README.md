# Fretpad

Write guitar practice tab by tapping the fretboard and choosing the finger you use for each note. Play it back, then re-finger runs with a hand-position tool that keeps every pitch.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run typecheck
npm run lint
npm run build    # type-checks, then builds the static site in dist/
```

## Using it

- **Add notes:** tap a fret, then a finger (1–4, T, or none). Open strings go straight in.
- **Edit:** tap a note in the tab to change its finger or tap a fret to move it.
- **Reconfinger** (F): tap the first and last notes of a run, then slide the hand with − / +. Notes keep their pitch, move under your hand and get one finger per fret. Rings show the same pitch on other strings, with the best fit solid.
- **Key and mode:** shows the scale on the neck and flags notes outside the key. Key, mode and note value sit under the title as a summary (e.g. "A Dorian · ♪ eighths"); click it to edit them in place. It opens by itself for a sheet with no key and folds back once the mode is picked.
- **Playback:** tempo, note value per column, loop and metronome click. Space plays.
- **Loop section:** select a column and press **[** to start a section there or **]** to end it (or use the [ ] buttons by Loop). In Reconfinger the brackets take the selected run. Play then covers just the section, repeating if Loop is on; **×** clears it. Saved with the sheet.
- **Sheets** menu: switch, add or delete sheets. They save in your browser's local storage. **Export** gives plain-text tab with a fingering row.
- Bar lines from older sheets still show and can be deleted, but there's no tool to add new ones.

## How the code is organised

React 19 + TypeScript (strict, with `noUncheckedIndexedAccess`) + Vite.

```
src/
  music/        pure domain logic, no React
    types.ts      Note, Finger, Column (notes | rest | bar), Sheet, Key
    theory.ts     tuning, note names, modes, scales
    fingering.ts  hand position, fit a run, same-pitch alternatives
    tab.ts        sheet and column helpers
    ascii.ts      plain-text export
  audio/
    synth.ts      Web Audio guitar voice (Karplus-Strong + body EQ + room)
    player.ts     look-ahead playback scheduler
    usePlayback.ts  the one hook that connects them to React
  state/
    editor.ts     the editor state machine (useReducer); Mode and Action unions
    views.ts      view models for the staff and fretboard
    keymap.ts     keyboard shortcuts per mode
    storage.ts    localStorage, reads the prototype's format
  components/   presentational React components (.tsx)
prototype/      the original single-file version, kept for reference
```

### Editor modes

The editor is a reducer with explicit modes. `Mode` and `Action` are discriminated unions, and each mode's handler table is typed against that mode, so handlers get narrowed state. Each mode lists the actions it accepts; anything else is ignored. The `fingering` mode is what the UI calls Reconfinger.

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
