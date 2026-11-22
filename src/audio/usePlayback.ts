import { useEffect, useMemo, useRef, useState } from 'react';
import { createPlayer } from './player.ts';
import { createSynth } from './synth.ts';
import type { Sheet } from '../music/types.ts';
import type { PlaybackSettings, Player, StartOptions } from './player.ts';
import type { Synth } from './synth.ts';

/**
 * Owns the synth and player for the app's lifetime.
 * Returns the sounding column (-1 when stopped) plus start/stop/preview.
 */
export interface Playback {
  playing: boolean;
  /** Column now sounding, or -1. */
  playingIndex: number;
  start(options?: StartOptions): void;
  stop(): void;
  /** Sound one note as feedback for a tap. Silent while playing. */
  preview(midi: number): void;
}

export function usePlayback(sheet: Sheet, settings: PlaybackSettings): Playback {
  const [playing, setPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const latest = useRef({ sheet, settings });
  const engine = useRef<{ synth: Synth; player: Player } | null>(null);

  useEffect(() => {
    latest.current = { sheet, settings };
  }, [sheet, settings]);

  useEffect(() => {
    const synth = createSynth();
    const player = createPlayer(synth, () => latest.current, { onStep: setPlayingIndex, onState: setPlaying });
    engine.current = { synth, player };
    return () => player.stop();
  }, []);

  // stable identities, so callers can use them in effect dependencies
  const controls = useMemo(
    () => ({
      start: (opts?: StartOptions) => engine.current?.player.start(opts),
      stop: () => engine.current?.player.stop(),
      // no preview notes over playback: editing while it plays stays silent
      preview: (midi: number) => {
        const e = engine.current;
        if (e && !e.player.isPlaying()) e.synth.preview(midi);
      },
    }),
    [],
  );

  return { playingIndex, playing, ...controls };
}
