import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from './App.tsx';

describe('App', () => {
  it('renders the starting sheet (C major preset), transport and fretboard', () => {
    const html = renderToString(<App />);
    expect(html).toContain('C major scale');
    expect(html).toContain('Play');
    expect(html).toContain('(<!-- -->C3<!-- -->)'); // the last note, the low root, is selected
    expect((html.match(/class="fret/g) ?? []).length).toBe(6 * 16);
  });
});
