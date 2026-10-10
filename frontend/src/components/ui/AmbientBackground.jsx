import React from 'react';

/**
 * Page-level ambient background: soft radial gradient + two blurred orbs.
 * Pure CSS (no filter: blur) and static, so it is cheap on mobile and calm for users.
 * Place inside a `relative` container; content should sit above it (`relative z-10`).
 */
const AmbientBackground = ({ fixed = false }) => (
  <div className={`ambient-bg ${fixed ? 'ambient-bg-fixed' : ''}`} aria-hidden="true">
    <span className="orb-3" />
  </div>
);

export default AmbientBackground;
