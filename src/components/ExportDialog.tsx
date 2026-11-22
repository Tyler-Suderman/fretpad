import { useRef, useState } from 'react';
import { toAscii } from '../music/ascii.ts';
import type { Sheet } from '../music/types.ts';

interface Props {
  sheet: Sheet;
  onClose: () => void;
}

export default function ExportDialog({ sheet, onClose }: Props) {
  const [message, setMessage] = useState('');
  const text = useRef<HTMLTextAreaElement>(null);
  const ascii = toAscii(sheet);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ascii);
      setMessage('Copied.');
    } catch {
      text.current?.focus();
      text.current?.select();
      setMessage('Text selected. Press Ctrl/⌘ C to copy.');
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" role="dialog" aria-labelledby="expTitle">
        <h2 id="expTitle">Plain-text tab</h2>
        <p>The row under each staff shows fingers: 1 index, 2 middle, 3 ring, 4 pinky, T thumb.</p>
        <textarea id="ascii" ref={text} readOnly spellCheck={false} value={ascii} />
        <div className="row">
          <button className="btn primary" onClick={() => void copy()}>
            Copy text
          </button>
          <span className="toast">{message}</span>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
