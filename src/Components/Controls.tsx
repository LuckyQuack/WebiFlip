interface ControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  brushRadius: number;
  onBrushSizeChange: (value: number) => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Controls = ({ onUndo, onRedo, onClear, brushRadius, onBrushSizeChange, canUndo, canRedo }: ControlsProps) => {
  return (
    <div className="controls">
      <button type="button" id="undo" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button type="button" id="redo" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        Redo
      </button>
      <button type="button" onClick={onClear}>
        Clear
      </button>
      <div className="brush-size-control">
        <label>Brush Size: {brushRadius}</label>
        <input
          type="range"
          min="1"
          max="100"
          value={brushRadius}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="brush-size-slider"
          title="Drag to adjust brush size"
        />
      </div>
    </div>
  );
};

export default Controls;
