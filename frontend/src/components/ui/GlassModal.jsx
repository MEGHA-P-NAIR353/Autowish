import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible glass dialog.
 * - role="dialog" + aria-modal + labelled by title
 * - Focus moves into the dialog, is trapped while open and restored on close
 * - Esc closes; optional overlay click to close; body scroll locked
 * - Animated enter/exit (respects prefers-reduced-motion via <MotionConfig>)
 */
const GlassModal = ({
  isOpen, onClose, title, description, children, size = 'md', closeOnOverlay = true, hideClose = false, footer, className = '',
}) => {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      const el = dialogRef.current;
      if (!el) return;
      const first = el.querySelector('[data-autofocus]') || el.querySelector(FOCUSABLE);
      (first || el).focus({ preventScroll: true });
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (closeOnOverlay && e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`glass-modal w-full ${SIZES[size] || SIZES.md} max-h-[90vh] flex flex-col overflow-hidden outline-none ${className}`}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-line-soft">
                <div className="min-w-0">
                  {title && <h2 id={titleId} className="font-semibold text-lg text-fg tracking-tight">{title}</h2>}
                  {description && <p id={descId} className="text-xs text-slate-400 mt-0.5">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="btn-ghost btn-icon -mr-2 -mt-1"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            <div className="p-6 overflow-y-auto">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-line-soft flex justify-end gap-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default GlassModal;
