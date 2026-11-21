import { FINGERS } from '../music/theory.ts';

/** Round finger buttons 1-4, T and optionally "none". `current` gets a ring. */
export default function FingerButtons({ current, onPick, allowNone = true }) {
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
