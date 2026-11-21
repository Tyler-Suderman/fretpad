// Keyboard shortcuts per editor mode. Returns an editor action, { type: 'TOGGLE_PLAY' }, or null. Pure.

const fingerKey = (key) => (['1', '2', '3', '4'].includes(key) ? key : key.toLowerCase() === 't' ? 'T' : null);

export function keyToAction({ key, shiftKey, metaKey, ctrlKey }, mode) {
  const lower = key.toLowerCase();
  if ((metaKey || ctrlKey) && lower === 'z') return { type: 'UNDO' };
  if (metaKey || ctrlKey) return null;
  const finger = fingerKey(key);

  if (mode.type === 'picking') {
    if (finger) return { type: 'CHOOSE_FINGER', finger };
    if (key === '0' || lower === 'n') return { type: 'CHOOSE_FINGER', finger: '' };
    if (key === 'Escape') return { type: 'CANCEL' };
    return null;
  }

  if (key === ' ') return { type: 'TOGGLE_PLAY' };

  if (mode.type === 'fingering') {
    if (finger) return { type: 'SET_FINGER', finger };
    if (key === 'ArrowLeft') return { type: 'STEP', d: -1, extend: shiftKey };
    if (key === 'ArrowRight') return { type: 'STEP', d: 1, extend: shiftKey };
    if (key === '-' || key === '[') return { type: 'SHIFT_HAND', d: -1 };
    if (key === '=' || key === '+' || key === ']') return { type: 'SHIFT_HAND', d: 1 };
    if (key === 'Escape' || key === 'Enter') return { type: 'EXIT' };
    return null;
  }

  // adding and editing
  if (mode.type === 'editing') {
    if (finger) return { type: 'SET_FINGER', finger };
    if (key === 'Escape') return { type: 'DONE' };
  }
  switch (key) {
    case 'Backspace':
    case 'Delete':
      return { type: 'DELETE' };
    case 'ArrowLeft':
      return { type: 'MOVE_CURSOR', d: -1 };
    case 'ArrowRight':
      return { type: 'MOVE_CURSOR', d: 1 };
    case 'ArrowUp':
      return { type: 'NUDGE_FRET', d: 1 };
    case 'ArrowDown':
      return { type: 'NUDGE_FRET', d: -1 };
  }
  if (lower === 'b') return { type: 'INSERT_BAR' };
  if (lower === 'r') return { type: 'INSERT_REST' };
  if (lower === 'f') return { type: 'ENTER_FINGERING' };
  return null;
}
