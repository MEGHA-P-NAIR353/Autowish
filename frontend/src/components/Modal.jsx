import React from 'react';
import GlassModal from './ui/GlassModal';

/**
 * Backwards-compatible modal wrapper (same props as before) now rendered with the
 * accessible, animated GlassModal. Previously the overlay did not close on click, so we
 * keep `closeOnOverlay` off to avoid losing form input by accident; Esc and the close
 * button still work.
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => (
  <GlassModal isOpen={isOpen} onClose={onClose} title={title} size={size} closeOnOverlay={false}>
    {children}
  </GlassModal>
);

export default Modal;
