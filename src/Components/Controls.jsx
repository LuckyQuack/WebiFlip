import React from 'react';

const Controls = ({
  onUndo,
  onRedo,
  onClear,
  brushRadius,
  onIncreaseBrush,
  onDecreaseBrush,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="controls">
      <button id="undo" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button id="redo" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        Redo
      </button>
      <button onClick={onClear}>
        Clear
      </button>
      <div className="brush-size-control">
        <label>Brush Size</label>
        <button onClick={onDecreaseBrush}>-</button>
        <span className="brush-radius-display">{brushRadius}</span>
        <button onClick={onIncreaseBrush}>+</button>
      </div>
    </div>
  );
};

export default Controls;
