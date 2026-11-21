import { describe, expect, it } from 'vitest';
import type { Mode } from './editor.ts';
import { keyToAction } from './keymap.ts';

const key = (k: string, extra: Partial<{ shiftKey: boolean; metaKey: boolean }> = {}) => ({
  key: k,
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  ...extra,
});

const adding: Mode = { type: 'adding' };
const editing: Mode = { type: 'editing' };
const picking: Mode = { type: 'picking', s: 2, f: 5, replace: false };
const fingering: Mode = { type: 'fingering', a: 0, b: 0, pos: 5 };

describe('keyToAction', () => {
  it('maps finger keys per mode', () => {
    expect(keyToAction(key('3'), picking)).toEqual({ type: 'CHOOSE_FINGER', finger: '3' });
    expect(keyToAction(key('t'), editing)).toEqual({ type: 'SET_FINGER', finger: 'T' });
    expect(keyToAction(key('2'), adding)).toBeNull();
  });

  it('space plays except while choosing a finger', () => {
    expect(keyToAction(key(' '), adding)).toEqual({ type: 'TOGGLE_PLAY' });
    expect(keyToAction(key(' '), picking)).toBeNull();
  });

  it('arrows step and extend in fingering mode', () => {
    expect(keyToAction(key('ArrowRight', { shiftKey: true }), fingering)).toEqual({ type: 'STEP', d: 1, extend: true });
  });

  it('undo works everywhere', () => {
    expect(keyToAction(key('z', { metaKey: true }), fingering)).toEqual({ type: 'UNDO' });
  });
});
