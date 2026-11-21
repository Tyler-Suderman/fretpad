// Core domain types for Fretpad.

/** A finger that frets a note: index–pinky or thumb. */
export type FrettingFinger = '1' | '2' | '3' | '4' | 'T';
/** What a note stores: a fretting finger, '0' for an open string, or '' when not written yet. */
export type Finger = FrettingFinger | '0' | '';

/** A place on the neck. `s` is the string index (0 = high e … 5 = low E), `f` the fret (0 = open). */
export interface Spot {
  s: number;
  f: number;
}

export interface Note extends Spot {
  finger: Finger;
}

/** One column of tab. Notes are a non-empty list so chords fit later without a format change. */
export interface NotesColumn {
  id: string;
  kind: 'notes';
  notes: [Note, ...Note[]];
}
export interface RestColumn {
  id: string;
  kind: 'rest';
}
/** A bar line; takes no time. */
export interface BarColumn {
  id: string;
  kind: 'bar';
}
export type Column = NotesColumn | RestColumn | BarColumn;

/** Note value of one column: quarter, eighth or sixteenth. */
export type Division = 4 | 8 | 16;

/** A key: root pitch class (0 = C … 11 = B) and an index into MODES. */
export interface Key {
  root: number;
  mode: number;
}

export interface Sheet {
  id: string;
  title: string;
  events: Column[];
  /** Selected column; new notes go after it. -1 = before the first column. */
  cursor: number;
  bpm: number;
  div: Division;
  key: Key | null;
}

/** A place a note could move to, with the hand position and finger that suit it. */
export interface Alternative extends Spot {
  pos: number;
  finger: Finger;
  fit: number;
  score: number;
  best: boolean;
}
