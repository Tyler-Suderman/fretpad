# Fretpad to-do

## Project
- [x] Move from the single-file prototype to React + Vite with tests and CI (2026-11-21)
- [ ] Remove prototype/ once the React app is confirmed at parity
- [x] Deploy to GitHub Pages (2026-11-21)
- [ ] Sync sheets across devices (account storage) and a text backup/restore

## Key and mode awareness (idea, 2026-11-21)
Set a root and mode per sheet (e.g. A Dorian). Then:
- [x] Root + mode per sheet (7 modes plus major/minor pentatonic), shown in export.
- [x] Scale dots on the neck.
- [x] Reconfinger (re-finger a run with a hand-position tool) — removed 2026-11-21; the note edit tool covers it.
- [x] Out-of-key notes get a small red dot under them in the tab.
- [x] Pick a fingering system per sheet: one finger per fret or CAGED shapes; the finger picker suggests a finger from it (2026-11-21).
- [ ] 3 notes per string as a third system.
- Flag notes outside the key as possible typos, while still allowing chromatic passing tones.
- Later: auto-finger a whole run with planned position shifts, scoring how hard each shift is, so long runs don't need splitting by hand.

## Smaller items
- Chords: tap several strings into one column.
- Techniques: bends, hammer-ons, pull-offs, slides as links between notes.
- Drag a note's dot on the fretboard to move it.
