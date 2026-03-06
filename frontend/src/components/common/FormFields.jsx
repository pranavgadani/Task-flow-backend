import React from "react";

export function FormField({ label, hint, children, className = "" }) {
  return (
    <div className={`form-group ${className}`.trim()} style={{ marginBottom: '22px' }}>
      {label ? (
        <label style={{
          display: 'block',
          marginBottom: '10px',
          fontSize: '13px',
          fontWeight: '900',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px'
        }}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <small className="text-muted" style={{ display: 'block', marginTop: '6px', fontSize: '12px', fontWeight: '500' }}>{hint}</small> : null}
    </div>
  );
}

const commonInputStyle = {
  width: '100%',
  padding: '14px 18px',
  border: 'none',
  borderRadius: '14px',
  background: 'var(--neu-bg)',
  boxShadow: 'var(--neu-shadow-sm)',
  color: 'var(--text-main)',
  fontSize: '14px',
  fontWeight: '600',
  outline: 'none',
  transition: 'all 0.3s ease'
};

export function TextInput({ label, hint, className = "", inputClassName = "", ...props }) {
  return (
    <FormField label={label} hint={hint} className={className}>
      <input
        className={`form-control ${inputClassName}`.trim()}
        style={commonInputStyle}
        onFocus={(e) => e.target.style.boxShadow = 'var(--neu-shadow-inner)'}
        onBlur={(e) => e.target.style.boxShadow = 'var(--neu-shadow-sm)'}
        {...props}
      />
    </FormField>
  );
}

export function TextAreaField({ label, hint, className = "", inputClassName = "", ...props }) {
  return (
    <FormField label={label} hint={hint} className={className}>
      <textarea
        className={`form-control ${inputClassName}`.trim()}
        style={{ ...commonInputStyle, height: '100px', resize: 'none' }}
        onFocus={(e) => e.target.style.boxShadow = 'var(--neu-shadow-inner)'}
        onBlur={(e) => e.target.style.boxShadow = 'var(--neu-shadow-sm)'}
        {...props}
      />
    </FormField>
  );
}

export function SelectField({
  label,
  hint,
  className = "",
  selectClassName = "",
  options,
  children,
  ...props
}) {
  return (
    <FormField label={label} hint={hint} className={className}>
      <select
        className={`form-control ${selectClassName}`.trim()}
        style={{ ...commonInputStyle, appearance: 'auto' }}
        onFocus={(e) => e.target.style.boxShadow = 'var(--neu-shadow-inner)'}
        onBlur={(e) => e.target.style.boxShadow = 'var(--neu-shadow-sm)'}
        {...props}
      >
        {options
          ? options.map((opt) => (
            <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
          : children}
      </select>
    </FormField>
  );
}

