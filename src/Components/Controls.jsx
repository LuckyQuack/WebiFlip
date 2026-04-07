import React from 'react';

const Controls = ({
  onUndo,
  onRedo,
  onClear,
  brushRadius,
  onBrushSizeChange,
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
        <label>Brush Size: {brushRadius}</label>
        <input
          type="range"
          min="1"
          max="100"
          value={brushRadius}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
          className="brush-size-slider"
          title="Drag to adjust brush size"
        />
      </div>
    </div>
  );
};

export default Controls;
