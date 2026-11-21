import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('renders the sample sheet, transport and fretboard', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Example: 1-2-3-4 chromatic warm-up');
    expect(html).toContain('Play');
    expect(html).toContain('Selected: <b>bar line</b>');
    expect((html.match(/class="fret/g) ?? []).length).toBe(6 * 16);
  });
});
