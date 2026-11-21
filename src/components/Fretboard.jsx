import { fingerFor, inBox } from '../music/fingering.ts';
import { FRETS, OPEN, TUNING, midiAt, noteName } from '../music/theory.ts';

const FRET_NUMBERS = Array.from({ length: FRETS + 1 }, (_, f) => f);
const INLAYS = [3, 5, 7, 9, 15];
const same = (a, s, f) => a && a.s === s && a.f === f;

/** The mark drawn on one fret space, in priority order. */
function Mark({ s, f, view }) {
  if (same(view.pending, s, f)) return <span className="dot pending" />;

  const note = view.shown.find((n) => same(n, s, f));
  if (note) {
    const label = note.finger && note.finger !== OPEN ? note.finger : f === 0 ? '0' : '';
    return <span className={`dot f${note.finger ?? ''}`}>{label}</span>;
  }

  const alt = view.alternatives.find((a) => same(a, s, f));
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

  const pc = midiAt(s, f) % 12;
  if (view.scale?.has(pc)) {
    const root = pc === view.root ? ' root' : '';
    if (view.hand != null && inBox(f, view.hand)) return <span className={`sdot big${root}`}>{fingerFor(f, view.hand)}</span>;
    return <span className={`sdot${root}`} />;
  }
  return null;
}

export default function Fretboard({ view, onTap }) {
  return (
    <div className="boardwrap">
      <div className="board">
        <div className="wood" />
        <div className="nutbar" />
        {view.hand != null && <div className="handbox" style={{ gridColumn: `${view.hand + 1} / span 4` }} />}
        {INLAYS.map((f) => (
          <div key={f} className="inlay" style={{ gridColumn: f + 1 }} />
        ))}
        <div className="inlay dbl" style={{ gridColumn: 13 }} />

        {TUNING.map((t, s) =>
          FRET_NUMBERS.map((f) => (
            <button
              key={`${s}-${f}`}
              className={f === 0 ? 'fret open' : 'fret'}
              style={{ gridRow: s + 1, gridColumn: f + 1, '--sw': `${(1.2 + s * 0.45).toFixed(2)}px` }}
              aria-label={`${t.label} string ${f === 0 ? 'open' : `fret ${f}`}, ${noteName(s, f)}`}
              onClick={() => onTap(s, f)}
            >
              {f === 0 && <span className="slabel">{t.label}</span>}
              <Mark s={s} f={f} view={view} />
            </button>
          )),
        )}

        {FRET_NUMBERS.map((f) => (
          <div
            key={f}
            className={view.hand != null && inBox(f, view.hand) ? 'fnum inbox' : 'fnum'}
            style={{ gridColumn: f + 1 }}
          >
            {f === 0 ? 'open' : f}
          </div>
        ))}
      </div>
    </div>
  );
}
