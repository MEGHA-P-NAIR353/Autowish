import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Accessible form field wrapper. Errors are conveyed with an icon + text + aria-invalid,
 * never by colour alone.
 */
const Field = ({ id, label, hint, error, required, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="field-label">
        {label}{required && <span className="text-rose-400 ml-0.5" aria-hidden="true">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="field-error">
        <AlertCircle size={13} aria-hidden="true" /> {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="field-hint">{hint}</p>
    ) : null}
  </div>
);

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const GlassInput = forwardRef(({ label, hint, error, leftIcon, rightSlot, className = '', wrapperClassName = '', id: idProp, required, ...rest }, ref) => {
  const auto = useId();
  const id = idProp || `in-${auto}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <div className="relative">
        {leftIcon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true">{leftIcon}</span>}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`glass-input ${leftIcon ? 'pl-10' : ''} ${rightSlot ? 'pr-10' : ''} ${className}`}
          {...rest}
        />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
    </Field>
  );
});
GlassInput.displayName = 'GlassInput';

export const GlassTextarea = forwardRef(({ label, hint, error, className = '', wrapperClassName = '', id: idProp, required, rows = 4, ...rest }, ref) => {
  const auto = useId();
  const id = idProp || `ta-${auto}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`glass-input resize-none leading-relaxed ${className}`}
        {...rest}
      />
    </Field>
  );
});
GlassTextarea.displayName = 'GlassTextarea';

export const GlassSelect = forwardRef(({ label, hint, error, className = '', wrapperClassName = '', id: idProp, required, children, ...rest }, ref) => {
  const auto = useId();
  const id = idProp || `sel-${auto}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`glass-input ${className}`}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
});
GlassSelect.displayName = 'GlassSelect';

export { Field };
