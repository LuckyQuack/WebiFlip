import React, { useEffect, useRef, useState } from 'react';

const ExportMenu = ({ disabled = false, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const handleOptionClick = async (action) => {
    setIsOpen(false);
    await action();
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
