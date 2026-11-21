// Guitar and music-theory constants and helpers. Pure: no DOM, no React.

/** Standard tuning, high e first (tab order). `midi` is the MIDI note of the open string. */
export const TUNING = [
  { label: 'e', midi: 64 },
  { label: 'B', midi: 59 },
  { label: 'G', midi: 55 },
  { label: 'D', midi: 50 },
  { label: 'A', midi: 45 },
  { label: 'E', midi: 40 },
];

export const FRETS = 15;

export const FINGERS = [
  { key: '1', name: 'Index' },
  { key: '2', name: 'Middle' },
  { key: '3', name: 'Ring' },
  { key: '4', name: 'Pinky' },
  { key: 'T', name: 'Thumb' },
];

/** Finger value stored for an open string. */
export const OPEN = '0';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export const ROOTS = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MODE_NAMES = ['Ionian (major)', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian (minor)', 'Locrian'];

/** Modes 1-7 are rotations of the major scale; pentatonics follow. */
export const MODES = [
  ...MODE_NAMES.map((short, i) => ({
    name: `${i + 1} · ${short}`,
    short,
    steps: MAJOR.map((_, k) => (MAJOR[(i + k) % 7] - MAJOR[i] + 12) % 12),
  })),
  { name: 'Major pentatonic', short: 'major pentatonic', steps: [0, 2, 4, 7, 9] },
  { name: 'Minor pentatonic', short: 'minor pentatonic', steps: [0, 3, 5, 7, 10] },
];

export const midiAt = (string, fret) => TUNING[string].midi + fret;
export const midiOf = (note) => midiAt(note.s, note.f);

export const noteName = (string, fret) => {
  const m = midiAt(string, fret);
  return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
};

/** Every (string, fret) that sounds MIDI note `m` within the playable range. */
export const spotsFor = (m) =>
  TUNING.map((t, s) => ({ s, f: m - t.midi })).filter((p) => p.f >= 0 && p.f <= FRETS);

/** Pitch classes in a key, or null when no key is set. key = { root: 0-11, mode: index into MODES } */
export const scaleOf = (key) =>
  key ? new Set(MODES[key.mode].steps.map((step) => (step + key.root) % 12)) : null;

export const inScale = (scale, m) => !scale || scale.has(m % 12);

export const keyName = (key) => (key ? `${ROOTS[key.root].split('/')[0]} ${MODES[key.mode].short}` : '');
