import { useEffect, useRef } from 'react';
import { OPEN, TUNING, keyName, noteName } from '../music/theory.js';

const strings = TUNING.map((_, s) => s);

function NoteColumn({ col, onSelect }) {
  const cls = ['col', col.kind, col.selected && 'sel', col.inRange && 'rsel', col.editing && 'editing', col.playing && 'play']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} data-i={col.i} onClick={(e) => onSelect(col.i, e.shiftKey)}>
      {strings.map((s) => {
        if (col.kind === 'bar') return <div key={s} className="cell" />;
        const n = col.notes.find((x) => x.s === s);
        if (!n) return <div key={s} className="cell" />;
        const showFinger = n.finger && n.finger !== OPEN;
        return (
          <div key={s} className="cell">
            <span
              className={n.outOfKey ? 'num ook' : 'num'}
              data-f={n.finger ?? ''}
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

export default function Staff({ view, onSelect }) {
  const wrap = useRef(null);

  // keep the selected or playing column in view
  useEffect(() => {
    wrap.current?.querySelector('.col.play, .col.sel, .col.editing')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
