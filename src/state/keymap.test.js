import { describe, expect, it } from 'vitest';
import { keyToAction } from './keymap.js';

const key = (k, extra = {}) => ({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, ...extra });

describe('keyToAction', () => {
  it('maps finger keys per mode', () => {
    expect(keyToAction(key('3'), { type: 'picking' })).toEqual({ type: 'CHOOSE_FINGER', finger: '3' });
    expect(keyToAction(key('t'), { type: 'editing' })).toEqual({ type: 'SET_FINGER', finger: 'T' });
    expect(keyToAction(key('2'), { type: 'adding' })).toBeNull();
  });

  it('space plays except while choosing a finger', () => {
    expect(keyToAction(key(' '), { type: 'adding' })).toEqual({ type: 'TOGGLE_PLAY' });
    expect(keyToAction(key(' '), { type: 'picking' })).toBeNull();
  });

  it('arrows step and extend in fingering mode', () => {
    expect(keyToAction(key('ArrowRight', { shiftKey: true }), { type: 'fingering' })).toEqual({
      type: 'STEP',
      d: 1,
      extend: true,
    });
  });

  it('undo works everywhere', () => {
    expect(keyToAction(key('z', { metaKey: true }), { type: 'fingering' })).toEqual({ type: 'UNDO' });
  });
});
