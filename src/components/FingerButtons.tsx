import { FINGERS } from '../music/theory.ts';
import type { Finger } from '../music/types.ts';

interface Props {
  /** Finger currently on the note; that button gets a ring. */
  current?: Finger | null;
  /** Suggested finger; that button gets a dashed ring and Enter picks it. */
  suggested?: Finger | null;
  onPick: (finger: Finger) => void;
  allowNone?: boolean;
}

/** Round finger buttons 1-4, T and optionally "none". */
export default function FingerButtons({ current = null, suggested = null, onPick, allowNone = true }: Props) {
  return (
    <>
      {FINGERS.map((x) => (
        <button
          key={x.key}
          className={['fbtn', current === x.key && 'cur', suggested === x.key && 'sug'].filter(Boolean).join(' ')}
          data-f={x.key}
          title={current === x.key ? `${x.name} (current)` : suggested === x.key ? `${x.name} (suggested, Enter)` : x.name}
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
