import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  accent: 'btn-accent',
};
const SIZES = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/**
 * Consistent button system.
 *  - variant: primary | secondary (glass) | ghost | danger | accent
 *  - loading: shows spinner, disables the button and sets aria-busy
 *  - as: render as another element/component (e.g. react-router `Link`)
 */
const GlassButton = forwardRef(({
  as: Tag = 'button', variant = 'secondary', size = 'md', loading = false, iconOnly = false,
  leftIcon, rightIcon, className = '', children, disabled, type, ...rest
}, ref) => {
  const isButton = Tag === 'button';
  const classes = [VARIANTS[variant] || VARIANTS.secondary, SIZES[size], iconOnly && 'btn-icon', className].filter(Boolean).join(' ');
  return (
    <Tag
      ref={ref}
      className={classes}
      aria-busy={loading || undefined}
      {...(isButton ? { type: type || 'button', disabled: disabled || loading } : { 'aria-disabled': disabled || loading || undefined })}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </Tag>
  );
});
GlassButton.displayName = 'GlassButton';

export default GlassButton;
