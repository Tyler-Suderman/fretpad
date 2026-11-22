# Fretpad to-do

## Project
- [x] Move from the single-file prototype to React + Vite with tests and CI (2026-11-21)
- [ ] Remove prototype/ once the React app is confirmed at parity
- [ ] Deploy to GitHub Pages
- [ ] Sync sheets across devices (account storage) and a text backup/restore

## Key and mode awareness (idea, 2026-11-21)
Set a root and mode per sheet (e.g. A Dorian). Then in Reconfinger:
- [x] Root + mode per sheet (7 modes plus major/minor pentatonic), shown in export.
- [x] Scale dots on the neck; inside the hand box they show the finger (one finger per fret).
- [x] Alternative spots show a suggested finger; the one that fits the 3 notes before and after best is solid.
- [x] Out-of-key notes get a small red dot under them in the tab.
- [ ] Pick a fingering system: one finger per fret (current), 3 notes per string, or CAGED shapes. The same scale fingers differently in each.
- Flag notes outside the key as possible typos, while still allowing chromatic passing tones.
- Later: auto-finger a whole run with planned position shifts, scoring how hard each shift is, so long runs don't need splitting by hand.

## Smaller items
- Mark a position shift inside a single fingering selection.
- Chords: tap several strings into one column.
- Techniques: bends, hammer-ons, pull-offs, slides as links between notes.
- Drag a note's dot on the fretboard to move it.
