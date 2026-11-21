// Look-ahead playback scheduler: queues notes slightly ahead on the audio clock so timing holds even
// when the page is busy, and reports which column is sounding. Framework-free.
import { midiOf } from '../music/theory.js';

const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead
const TICK_MS = 25;

/** Seconds per column: bpm counts quarter notes; div is the column's note value (4, 8, 16). */
export const columnSeconds = (bpm, div) => 60 / bpm / (div / 4);

const playable = (events) => events.some((e) => e.kind !== 'bar');

/**
 * @param synth   from createSynth()
 * @param read    () => ({ sheet, settings }) — read live so edits during playback are heard
 * @param onStep  (index) => void — the column now sounding
 * @param onState (playing: boolean) => void
 */
export function createPlayer(synth, read, { onStep, onState }) {
  let timer = null;
  let frame = null;
  let run = null;

  function schedule() {
    const { sheet, settings } = read();
    const { events } = sheet;
    const len = columnSeconds(sheet.bpm, sheet.div);
    const beatEvery = sheet.div / 4; // columns per beat
    while (!run.ending && run.next < synth.now() + LOOKAHEAD) {
      const hi = run.hi == null ? events.length - 1 : Math.min(run.hi, events.length - 1);
      if (run.i > hi) {
        if (settings.loop && playable(events.slice(run.lo, hi + 1))) {
          run.i = run.lo;
          run.step = 0;
          continue;
        }
        run.queue.push({ t: run.next, i: -1 });
        run.ending = true;
        break;
      }
      const ev = events[run.i];
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

  function follow() {
    if (!run) return;
    let current = null;
    while (run.queue.length && run.queue[0].t <= synth.now()) current = run.queue.shift().i;
    if (current === -1) return stop();
    if (current !== null) onStep(current);
    frame = requestAnimationFrame(follow);
  }

  /** range = { a, b } plays and loops those columns; otherwise start at `from` and loop the sheet. */
  function start({ range, from = 0 } = {}) {
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

  function stop() {
    if (!run) return;
    clearInterval(timer);
    cancelAnimationFrame(frame);
    run = null;
    onStep(-1);
    onState(false);
  }

  return { start, stop, isPlaying: () => run !== null };
}
