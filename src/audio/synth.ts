// Plucked-guitar synth on the Web Audio API. Framework-free.
//
// Voice = Karplus-Strong string (a short excitation looped through a lowpass delay line)
//       + a quiet rounded tone at the same pitch for body,
// into a guitar-body EQ (air ~105 Hz, top ~210 Hz, wood ~420 Hz, pick presence ~2.6 kHz),
// a gentle top-end roll-off, and a small room reverb.

const midiToHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

export interface Synth {
  /** Call from a user gesture: browsers only start audio after one. */
  resume(): void;
  /** Pluck MIDI note `m` at audio time `t` for `dur` seconds. */
  pluck(m: number, t: number, dur: number): void;
  /** Metronome tick; `accent` for the first beat of a bar. */
  click(t: number, accent: boolean): void;
  /** Play one note now (fret taps, selecting notes). */
  preview(m: number): void;
  /** Current audio clock time in seconds (0 before audio starts). */
  now(): number;
}

interface Engine {
  ctx: AudioContext;
  input: GainNode;
}

interface KarplusString {
  buffer: AudioBuffer;
  rate: number;
}

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export function createSynth(): Synth {
  let engine: Engine | null = null;
  const strings = new Map<number, KarplusString>();

  function setup(): Engine {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio is not supported in this browser');
    const ctx = new Ctor();
    const input = ctx.createGain();
    input.gain.value = 0.75;

    const eq = (type: BiquadFilterType, frequency: number, Q: number, gain: number): BiquadFilterNode => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = frequency;
      f.Q.value = Q;
      f.gain.value = gain;
      return f;
    };
    const body: BiquadFilterNode[] = [
      eq('peaking', 105, 1.4, 5),
      eq('peaking', 210, 1.6, 3.5),
      eq('peaking', 420, 2, 1.5),
      eq('peaking', 2600, 1, 2),
      eq('lowpass', 4200, 0.6, 0),
    ];
    // chain input -> each filter in order; connect() returns its destination
    const out = body.reduce<AudioNode>((prev, node) => prev.connect(node), input);
    const comp = ctx.createDynamicsCompressor();
    out.connect(comp);
    comp.connect(ctx.destination);

    // small room: a short decaying-noise impulse, mixed in quietly
    const len = Math.floor(ctx.sampleRate * 0.7);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const room = ctx.createConvolver();
    room.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.12;
    out.connect(room);
    room.connect(wet);
    wet.connect(comp);
    return { ctx, input };
  }

  function resume(): Engine {
    engine ??= setup();
    if (engine.ctx.state === 'suspended') void engine.ctx.resume();
    return engine;
  }

  function stringFor(ctx: AudioContext, m: number): KarplusString {
    const cached = strings.get(m);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const hz = midiToHz(m);
    const period = Math.max(2, Math.floor(sr / hz));
    const buffer = ctx.createBuffer(1, Math.floor(sr * 2.5), sr);
    const d = buffer.getChannelData(0);
    // excitation: rounded pluck shape (picked at 30% of the string) with a little noise for the pick edge
    const ex = new Float32Array(period);
    for (let i = 0; i < period; i++) {
      const x = i / period;
      ex[i] = (x < 0.3 ? x / 0.3 : (1 - x) / 0.7) - 0.5 + (Math.random() * 2 - 1) * 0.16;
    }
    // indices below are in range by construction; typed arrays read as `number | undefined` under strict indexing
    for (let pass = 0; pass < 2; pass++) {
      let p = ex[0]!;
      for (let i = 0; i < period; i++) ex[i] = p = p * 0.5 + ex[i]! * 0.5;
    }
    for (let i = 0; i < period; i++) d[i] = ex[i]! * 0.9;
    for (let i = period; i < d.length; i++) d[i] = 0.4975 * (d[i - period]! + d[i - period + 1]!);
    // the loop tunes to sr/(period+0.5); playbackRate corrects the rest so every fret is in tune
    const entry: KarplusString = { buffer, rate: hz / (sr / (period + 0.5)) };
    strings.set(m, entry);
    return entry;
  }

  function pluck(m: number, t: number, dur: number): void {
    const { ctx, input } = resume();
    const { buffer, rate } = stringFor(ctx, m);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.75, t + 0.005); // ~5 ms: a pick edge without a click
    g.gain.setValueAtTime(0.75, t + dur);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);
    src.connect(g).connect(input);
    src.start(t);
    src.stop(t + dur + 0.1);

    // body layer: soft sine + quiet octave triangle, fading faster than the string
    const hz = midiToHz(m);
    const bg = ctx.createGain();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const o2g = ctx.createGain();
    o1.type = 'sine';
    o1.frequency.value = hz;
    o2.type = 'triangle';
    o2.frequency.value = hz * 2;
    o2g.gain.value = 0.25;
    o1.connect(bg);
    o2.connect(o2g).connect(bg);
    const ring = Math.min(dur, 1.4);
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(0.2, t + 0.018);
    bg.gain.exponentialRampToValueAtTime(0.04, t + ring * 0.6);
    bg.gain.setValueAtTime(0.04, t + dur);
    bg.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);
    bg.connect(input);
    for (const o of [o1, o2]) {
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  function click(t: number, accent: boolean): void {
    const { ctx, input } = resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = accent ? 1320 : 880;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(accent ? 0.22 : 0.13, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g).connect(input);
    o.start(t);
    o.stop(t + 0.07);
  }

  function preview(m: number): void {
    const { ctx } = resume();
    pluck(m, ctx.currentTime + 0.01, 0.9);
  }

  return {
    resume: () => void resume(),
    pluck,
    click,
    preview,
    now: () => engine?.ctx.currentTime ?? 0,
  };
}
