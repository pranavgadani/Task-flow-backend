import React from "react";

export default function PageHeader({ title, buttonText, onButtonClick }) {
  return (
    <div className="header">
      <h2>{title}</h2>
      {buttonText && onButtonClick && (
        <button className="btn btn-primary" onClick={onButtonClick}>
          {buttonText}
        </button>
      )}
    </div>
  );
}
