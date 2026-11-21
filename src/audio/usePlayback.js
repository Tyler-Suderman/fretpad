import { useEffect, useRef, useState } from 'react';
import { createPlayer } from './player.js';
import { createSynth } from './synth.js';

/**
 * Owns the synth and player for the app's lifetime.
 * Returns the sounding column (-1 when stopped) plus start/stop/preview.
 */
export function usePlayback(sheet, settings) {
  const [playing, setPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const latest = useRef({ sheet, settings });
  const engine = useRef(null);

  useEffect(() => {
    latest.current = { sheet, settings };
  }, [sheet, settings]);

  useEffect(() => {
    const synth = createSynth();
    const player = createPlayer(synth, () => latest.current, { onStep: setPlayingIndex, onState: setPlaying });
    engine.current = { synth, player };
    return () => player.stop();
  }, []);

  return {
    playingIndex,
    playing,
    start: (opts) => engine.current.player.start(opts),
    stop: () => engine.current.player.stop(),
    preview: (midi) => engine.current.synth.preview(midi),
  };
}
