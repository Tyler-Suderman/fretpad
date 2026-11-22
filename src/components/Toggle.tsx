import type { ComponentPropsWithoutRef } from 'react';

type ToggleProps = { on: boolean } & ComponentPropsWithoutRef<'button'>;

/** An on/off button (aria-pressed). */
export default function Toggle({ on, children, ...rest }: ToggleProps) {
  return (
    <button className="btn toggle" aria-pressed={on} {...rest}>
      {children}
    </button>
  );
}
