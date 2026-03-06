import React from "react";

export default function FormModal({
  show,
  onClose,
  title,
  children,
  onSave,
  saveText = "Save",
  cancelText = "Cancel",
  maxWidth = "500px"
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onSave}>
            {saveText}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
