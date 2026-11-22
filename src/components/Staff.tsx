import { useEffect, useRef } from 'react';
import { OPEN, TUNING, keyName, noteName } from '../music/theory.ts';
import type { StaffColumn, StaffView } from '../state/views.ts';

type OnSelect = (i: number, extend?: boolean) => void;

const STRINGS = TUNING.map((_, s) => s);

function NoteColumn({ col, onSelect }: { col: StaffColumn; onSelect: OnSelect }) {
  const cls = [
    'col',
    col.kind,
    col.selected && 'sel',
    col.editing && 'editing',
    col.playing && 'play',
    col.inSection && 'loopsec',
    col.sectionStart && 'loopstart',
    col.sectionEnd && 'loopend',
    col.sectionOpen && 'loopopen',
    col.measureStart && 'measure',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} data-i={col.i} onClick={(e) => onSelect(col.i, e.shiftKey)}>
      {STRINGS.map((s) => {
        const n = col.kind === 'notes' ? col.notes.find((x) => x.s === s) : undefined;
        if (!n) return <div key={s} className="cell" />;
        const showFinger = n.finger !== '' && n.finger !== OPEN;
        return (
          <div key={s} className="cell">
            <span
              className={n.outOfKey ? 'num ook' : 'num'}
              data-f={n.finger}
              title={n.outOfKey ? `${noteName(n.s, n.f)} is outside the key` : undefined}
            >
              {n.f}
              {showFinger && <sub>{n.finger}</sub>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Where in the readable width (right of the pinned labels) the marker triggers a turn, and where it lands after. */
const TURN_AT = 0.75;
const LAND_AT = 0.15;

/**
 * The marker moves across the pane; once it passes TURN_AT the tab slides left so the current column
 * sits at LAND_AT again. A column left of the view (a loop back to the start) turns back the same way.
 */
function followPlayhead(pane: HTMLElement, col: HTMLElement): void {
  const labels = pane.querySelector<HTMLElement>('.labels')?.offsetWidth ?? 0;
  const paneBox = pane.getBoundingClientRect();
  const colBox = col.getBoundingClientRect();
  const readableLeft = paneBox.left + labels;
  const readable = paneBox.right - readableLeft;
  const x = colBox.left - readableLeft;
  if (x >= 0 && colBox.right <= readableLeft + readable * TURN_AT) return;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  pane.scrollTo({ left: pane.scrollLeft + x - readable * LAND_AT, behavior: smooth ? 'smooth' : 'auto' });
}

export default function Staff({ view, onSelect }: { view: StaffView; onSelect: OnSelect }) {
  const wrap = useRef<HTMLDivElement>(null);

  // While playing, page-turn so there is always music ahead of the marker; otherwise keep the selection in view.
  useEffect(() => {
    const pane = wrap.current;
    if (!pane) return;
    const playing = pane.querySelector<HTMLElement>('.col.play');
    if (playing) followPlayhead(pane, playing);
    else pane.querySelector('.col.sel, .col.editing')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [view]);

  return (
    <div className="sheetwrap" ref={wrap} aria-label={view.key ? `Tab in ${keyName(view.key)}` : 'Tab'}>
      <div className="staff">
        <div className={view.startSelected ? 'col labels sel' : 'col labels'} title="Insert at start" onClick={() => onSelect(-1)}>
          {TUNING.map((t) => (
            <div key={t.label} className="cell">
              {t.label}
            </div>
          ))}
        </div>
        {view.columns.map((col) => (
          <NoteColumn key={col.id} col={col} onSelect={onSelect} />
        ))}
        {!view.columns.length && (
          <div className="empty">Tap a fret below to add your first note, then pick the finger you use for it.</div>
        )}
      </div>
    </div>
  );
}
