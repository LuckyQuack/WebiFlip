import { useEffect, useRef, useState } from 'react';

interface ExportOption {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

interface ExportMenuProps {
  disabled?: boolean;
  options?: ExportOption[];
}

const ExportMenu = ({ disabled = false, options = [] }: ExportMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const handleOptionClick = async (action: () => void | Promise<void>) => {
    setIsOpen(false);
    try {
      await action();
    } catch (error) {
      console.error('Export action failed:', error);
      window.alert('The export failed. Please try again.');
    }
  };

  return (
    <div className="sidebar-block export-menu" ref={menuRef}>
      <button
        type="button"
        className="export-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span>{disabled ? 'Exporting...' : 'Export'}</span>
        <span className="toolbar-icon">{isOpen ? '-' : '+'}</span>
      </button>
      {isOpen ? (
        <div className="export-dropdown">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              className="export-option"
              onClick={() => handleOptionClick(option.onClick)}
              disabled={disabled || option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ExportMenu;
