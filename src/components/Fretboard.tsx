import type { CSSProperties } from 'react';
import { fingerFor, inBox } from '../music/fingering.ts';
import { FRETS, OPEN, TUNING, midiAt, noteName } from '../music/theory.ts';
import type { Spot } from '../music/types.ts';
import type { FretboardView } from '../state/views.ts';

const FRET_NUMBERS = Array.from({ length: FRETS + 1 }, (_, f) => f);
const INLAYS = [3, 5, 7, 9, 15];
const at = (a: Spot | null | undefined, s: number, f: number): boolean => !!a && a.s === s && a.f === f;

/** The mark drawn on one fret space, in priority order. */
function Mark({ s, f, view }: { s: number; f: number; view: FretboardView }) {
  if (view.pending && at(view.pending, s, f)) {
    const { finger } = view.pending;
    return <span className="dot pending">{finger !== OPEN ? finger : ''}</span>;
  }

  const note = view.shown.find((n) => at(n, s, f));
  if (note) {
    const label = note.finger && note.finger !== OPEN ? note.finger : f === 0 ? '0' : '';
    return <span className={`dot f${note.finger}`}>{label}</span>;
  }

  const alt = view.alternatives.find((a) => at(a, s, f));
  if (alt) {
    return (
      <span
        className={alt.best ? 'dot ghost best' : 'dot ghost'}
        title={`Finger ${alt.finger === OPEN ? 'open' : alt.finger}, hand at fret ${alt.pos}`}
      >
        {alt.finger === OPEN ? '' : alt.finger}
      </span>
    );
  }

  const midi = midiAt(s, f);
  if (view.focus !== null && midi === view.focus) {
    return <span className="mark same" title={`${noteName(s, f)}, same pitch`} />;
  }
  if (view.focus !== null && midi % 12 === view.focus % 12) {
    return <span className="mark octave" title={`${noteName(s, f)}, an octave ${midi > view.focus ? 'up' : 'down'}`} />;
  }

  const pc = midi % 12;
  if (view.scale?.has(pc)) {
    const root = pc === view.root ? ' root' : '';
    if (view.hand !== null && inBox(f, view.hand)) return <span className={`sdot big${root}`}>{fingerFor(f, view.hand)}</span>;
    return <span className={`sdot${root}`} />;
  }
  return null;
}

/** CSS custom property for the string's drawn thickness. */
type StringStyle = CSSProperties & { '--sw': string };

export default function Fretboard({ view, onTap }: { view: FretboardView; onTap: (s: number, f: number) => void }) {
  return (
    <div className="boardwrap">
      <div className="board">
        <div className="wood" />
        <div className="nutbar" />
        {view.hand !== null && <div className="handbox" style={{ gridColumn: `${view.hand + 1} / span 4` }} />}
        {INLAYS.map((f) => (
          <div key={f} className="inlay" style={{ gridColumn: f + 1 }} />
        ))}
        <div className="inlay dbl" style={{ gridColumn: 13 }} />

        {TUNING.map((t, s) =>
          FRET_NUMBERS.map((f) => {
            const style: StringStyle = { gridRow: s + 1, gridColumn: f + 1, '--sw': `${(1.2 + s * 0.45).toFixed(2)}px` };
            return (
              <button
                key={`${s}-${f}`}
                className={f === 0 ? 'fret open' : 'fret'}
                style={style}
                aria-label={`${t.label} string ${f === 0 ? 'open' : `fret ${f}`}, ${noteName(s, f)}`}
                onClick={() => onTap(s, f)}
              >
                {f === 0 && <span className="slabel">{t.label}</span>}
                <Mark s={s} f={f} view={view} />
              </button>
            );
          }),
        )}

        {FRET_NUMBERS.map((f) => (
          <div
            key={f}
            className={view.hand !== null && inBox(f, view.hand) ? 'fnum inbox' : 'fnum'}
            style={{ gridColumn: f + 1 }}
          >
            {f === 0 ? 'open' : f}
          </div>
        ))}
      </div>
    </div>
  );
}
