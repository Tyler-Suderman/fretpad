// Plain-text tab export, with a fingering row under each staff.
import { OPEN, TUNING, keyName } from './theory.ts';
import type { Column, Sheet } from './types.ts';

const LINE_WIDTH = 72;
const PREFER_BREAK_AT = 60; // after this width, break at the next bar line

interface AsciiColumn {
  width: number;
  /** One segment per string, high e first. */
  strings: string[];
  finger: string;
  bar?: boolean;
}

function column(ev: Column): AsciiColumn {
  switch (ev.kind) {
    case 'bar':
      return { width: 2, strings: TUNING.map(() => '|-'), finger: '  ', bar: true };
    case 'rest':
      return { width: 2, strings: TUNING.map(() => '--'), finger: '  ' };
    case 'notes': {
      const width = Math.max(...ev.notes.map((n) => String(n.f).length));
      const strings = TUNING.map((_, s) => {
        const n = ev.notes.find((x) => x.s === s);
        return (n ? String(n.f) : '').padEnd(width, '-') + '-';
      });
      const lead = ev.notes[0];
      const finger = lead.finger && lead.finger !== OPEN ? lead.finger : '';
      return { width: width + 1, strings, finger: finger.padEnd(width + 1, ' ') };
    }
  }
}

function renderSystem(cols: AsciiColumn[]): string {
  const endsOnBar = cols[cols.length - 1]?.bar ?? false;
  const lines = TUNING.map((t, s) => {
    const body = cols.map((c) => c.strings[s]).join('');
    // a closing bar line doubles as the end of the staff
    return `${t.label}|-${endsOnBar ? body.slice(0, -1) : body + '|'}`;
  });
  const fingers = '   ' + cols.map((c) => c.finger).join('');
  if (fingers.trim()) lines.push(fingers.trimEnd());
  return lines.join('\n');
}

export function toAscii(sheet: Sheet): string {
  const systems: string[] = [];
  let current: AsciiColumn[] = [];
  let width = 0;
  for (const ev of sheet.events) {
    const col = column(ev);
    current.push(col);
    width += col.width;
    if ((width > PREFER_BREAK_AT && ev.kind === 'bar') || width > LINE_WIDTH) {
      systems.push(renderSystem(current));
      current = [];
      width = 0;
    }
  }
  if (current.length) systems.push(renderSystem(current));

  const head = [sheet.title, sheet.key ? `Key: ${keyName(sheet.key)}` : ''].filter(Boolean).join('\n');
  return (head ? `${head}\n\n` : '') + systems.join('\n\n') + '\n';
}
