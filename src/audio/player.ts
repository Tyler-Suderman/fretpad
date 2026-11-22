// Look-ahead playback scheduler: queues notes slightly ahead on the audio clock so timing holds even
// when the page is busy, and reports which column is sounding. Framework-free.
import { midiOf } from '../music/theory.ts';
import type { Column, Division, Sheet } from '../music/types.ts';
import type { Synth } from './synth.ts';

const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead
const TICK_MS = 25;

/** Seconds per column: bpm counts quarter notes; div is the column's note value (4, 8, 16). */
export const columnSeconds = (bpm: number, div: Division): number => 60 / bpm / (div / 4);

const playable = (events: readonly Column[]): boolean => events.some((e) => e.kind !== 'bar');

const pitches = (ev: Column | undefined): string =>
  ev?.kind === 'notes' ? ev.notes.map(midiOf).sort((x, y) => x - y).join(',') : '';

/**
 * Where a loop over columns lo..hi starts again. When it ends on the pitch it starts with (a scale up
 * and back down to the root), the repeat skips that first column so the root isn't played twice.
 */
export function loopRestart(events: readonly Column[], lo: number, hi: number): number {
  let first = lo;
  while (first <= hi && events[first]?.kind === 'bar') first++;
  let last = hi;
  while (last >= lo && events[last]?.kind === 'bar') last--;
  const p = pitches(events[first]);
  return first < last && p !== '' && p === pitches(events[last]) ? first + 1 : lo;
}

export interface PlaybackSettings {
  loop: boolean;
  click: boolean;
}

export interface PlaybackSource {
  sheet: Sheet;
  settings: PlaybackSettings;
}

export interface StartOptions {
  /** Play and loop just these columns (inclusive). */
  range?: { a: number; b: number };
  /** Column to start from when there is no range. */
  from?: number;
}

export interface Player {
  start(options?: StartOptions): void;
  stop(): void;
  isPlaying(): boolean;
}

interface Run {
  i: number;
  lo: number;
  hi: number | null;
  step: number;
  next: number;
  /** Columns scheduled but not yet sounding; i = -1 marks the end. */
  queue: { t: number; i: number }[];
  ending: boolean;
}

/**
 * @param read  read live, so edits during playback are heard
 * @param onStep  the column now sounding (-1 when stopped)
 */
export function createPlayer(
  synth: Synth,
  read: () => PlaybackSource,
  { onStep, onState }: { onStep: (index: number) => void; onState: (playing: boolean) => void },
): Player {
  let timer: ReturnType<typeof setInterval> | undefined;
  let frame = 0;
  let run: Run | null = null;

  function schedule(): void {
    if (!run) return;
    const { sheet, settings } = read();
    const { events } = sheet;
    const len = columnSeconds(sheet.bpm, sheet.div);
    const beatEvery = sheet.div / 4; // columns per beat
    while (!run.ending && run.next < synth.now() + LOOKAHEAD) {
      const hi = run.hi == null ? events.length - 1 : Math.min(run.hi, events.length - 1);
      if (run.i > hi) {
        if (settings.loop && playable(events.slice(run.lo, hi + 1))) {
          run.i = loopRestart(events, run.lo, hi);
          run.step = run.i === run.lo ? 0 : 1; // a skipped root still counts as the loop's first beat
          continue;
        }
        run.queue.push({ t: run.next, i: -1 });
        run.ending = true;
        break;
      }
      const ev = events[run.i];
      if (!ev) break;
      if (ev.kind === 'bar') {
        run.i += 1;
        run.step = 0; // accent the first beat after a bar line
        continue;
      }
      if (settings.click && run.step % beatEvery === 0) synth.click(run.next, run.step === 0);
      if (ev.kind === 'notes') for (const n of ev.notes) synth.pluck(midiOf(n), run.next, len * 0.97);
      run.queue.push({ t: run.next, i: run.i });
      run.next += len;
      run.i += 1;
      run.step += 1;
    }
  }

  function follow(): void {
    if (!run) return;
    let current: number | null = null;
    const now = synth.now();
    while (run.queue[0] && run.queue[0].t <= now) current = run.queue.shift()!.i;
    if (current === -1) return stop();
    if (current !== null) onStep(current);
    frame = requestAnimationFrame(follow);
  }

  function start({ range, from = 0 }: StartOptions = {}): void {
    stop();
    if (!playable(read().sheet.events)) return;
    synth.resume();
    run = {
      i: range ? range.a : from,
      lo: range ? range.a : 0,
      hi: range ? range.b : null,
      step: 0,
      next: synth.now() + 0.1,
      queue: [],
      ending: false,
    };
    onState(true);
    schedule();
    timer = setInterval(schedule, TICK_MS);
    frame = requestAnimationFrame(follow);
  }

  function stop(): void {
    if (!run) return;
    clearInterval(timer);
    cancelAnimationFrame(frame);
    run = null;
    onStep(-1);
    onState(false);
  }

  return { start, stop, isPlaying: () => run !== null };
}
