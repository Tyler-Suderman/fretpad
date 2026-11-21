import { FINGERS } from '../music/theory.ts';
import type { Finger } from '../music/types.ts';

interface Props {
  /** Finger currently on the note; that button gets a ring. */
  current?: Finger | null;
  onPick: (finger: Finger) => void;
  allowNone?: boolean;
}

/** Round finger buttons 1-4, T and optionally "none". */
export default function FingerButtons({ current = null, onPick, allowNone = true }: Props) {
  return (
    <>
      {FINGERS.map((x) => (
        <button
          key={x.key}
          className={current === x.key ? 'fbtn cur' : 'fbtn'}
          data-f={x.key}
          title={current === x.key ? `${x.name} (current)` : x.name}
          aria-label={`${x.name} finger`}
          onClick={() => onPick(x.key)}
        >
          {x.key}
        </button>
      ))}
      {allowNone && (
        <button className={current === '' ? 'fbtn none cur' : 'fbtn none'} title="No fingering" onClick={() => onPick('')}>
          none
        </button>
      )}
    </>
  );
}
