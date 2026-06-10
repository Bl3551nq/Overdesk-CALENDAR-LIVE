import React from 'react';

interface WindowControlsProps {
  onClose: () => void;
  onMinimize: () => void;
  onBubbleToggle: () => void;
  minimized: boolean;
  isBubble: boolean;
}

export function WindowControls({
  onClose,
  onMinimize,
  onBubbleToggle,
  minimized,
  isBubble
}: WindowControlsProps) {
  return (
    <div className="win-btns z-20 select-none">
      {/* Close button -> converts to bubble mode */}
      <button
        type="button"
        onClick={onClose}
        className="win-btn btn-close group relative"
        title="Close"
      >
        <span className="icon opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
      </button>

      {/* Minimize button -> toggles ticker view */}
      <button
        type="button"
        onClick={onMinimize}
        className="win-btn btn-min group relative"
        title="Ticker"
      >
        <span className="icon opacity-0 group-hover:opacity-100 transition-opacity">−</span>
      </button>

      {/* Compact button -> triggers compact bubble launcher */}
      <button
        type="button"
        onClick={onBubbleToggle}
        className="win-btn btn-bubble group relative"
        title="Compact"
      >
        <span className="icon opacity-0 group-hover:opacity-100 transition-opacity">●</span>
      </button>
    </div>
  );
}

export default WindowControls;
