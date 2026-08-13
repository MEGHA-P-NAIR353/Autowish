import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';
import Avatar from './common/Avatar';

// ─── Portal Dropdown ───────────────────────────────────────────────────────────
// Mounts the contact list at document.body using position:fixed so it escapes
// every overflow:hidden / overflow:auto / transform ancestor completely.
function DropdownPortal({ anchorRef, children, onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });
  const portalRef = useRef(null);

  // Recompute anchor rect in viewport coordinates.
  const reposition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const DROPDOWN_MAX_H = 350;
    const GAP = 6;

    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    // Prefer downward; only flip up if there is genuinely more room above.
    const placementDown = spaceBelow >= 120 || spaceBelow >= spaceAbove;

    setPos({
      width: rect.width,
      left: rect.left,
      // For downward: top = bottom of trigger + gap
      // For upward  : top = top of trigger - gap - dropdown height (clamped via transform)
      top: placementDown ? rect.bottom + GAP : rect.top - GAP,
      placement: placementDown ? 'bottom' : 'top',
    });
  }, [anchorRef]);

  useLayoutEffect(() => { reposition(); }, [reposition]);

  useEffect(() => {
    window.addEventListener('resize', reposition, { passive: true });
    window.addEventListener('scroll', reposition, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, { capture: true });
    };
  }, [reposition]);

  // Close on outside pointer-down (before click fires)
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (
        portalRef.current && !portalRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [onClose, anchorRef]);

  return createPortal(
    <div
      ref={portalRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        // translateY(-100%) shifts the panel above the trigger when flipping upward.
        // The matching keyframe starts from calc(-100% + 4px) for a natural slide-up.
        transform: pos.placement === 'top' ? 'translateY(-100%)' : 'translateY(0)',
        animation: pos.placement === 'top'
          ? 'cs-dropdown-in-up 130ms ease-out forwards'
          : 'cs-dropdown-in  130ms ease-out forwards',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── ContactSelector ───────────────────────────────────────────────────────────
export default function ContactSelector({ contacts, selected, onSelect }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const anchorRef = useRef(null); // measures trigger position for portal

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.relationship || '').toLowerCase().includes(search.toLowerCase())
  );

  // Reset focused index when filtered list changes
  useEffect(() => { setFocusedIdx(-1); }, [search]);

  const handleSelect = (c) => {
    onSelect(c);
    setSearch('');
    setOpen(false);
    setFocusedIdx(-1);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    setFocusedIdx(-1);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIdx >= 0 && filtered[focusedIdx]) {
          handleSelect(filtered[focusedIdx]);
        }
        break;
      case 'Escape':
        handleClose();
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIdx];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx]);

  return (
    <div ref={anchorRef} className="relative" onKeyDown={handleKeyDown}>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        Contact *
      </label>

      {/* Trigger / Search input */}
      <div
        className={`flex items-center gap-2 w-full bg-slate-800 border rounded-xl px-3 py-2.5 cursor-text transition-all duration-200 ${
          open
            ? 'border-indigo-500/70 ring-2 ring-indigo-500/20'
            : 'border-slate-700 hover:border-indigo-500/40'
        }`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <Search size={15} className="text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none min-w-0"
          placeholder="Search contacts by name or email…"
          value={selected && !open ? selected.name : search}
          onChange={e => {
            setSearch(e.target.value);
            if (selected) onSelect(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-autocomplete="list"
          aria-expanded={open}
          role="combobox"
          autoComplete="off"
        />
        {selected && !open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
              setSearch('');
              inputRef.current?.focus();
            }}
            className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-[10px] font-bold transition-colors"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
        <ChevronDown
          size={14}
          className={`text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Portal Dropdown — escapes every overflow ancestor */}
      {open && (
        <DropdownPortal anchorRef={anchorRef} onClose={handleClose}>
          <div
            role="listbox"
            ref={listRef}
            style={{ maxHeight: '350px' }}
            className="overflow-y-auto bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl shadow-black/70 py-1 ring-1 ring-black/20"
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <Search size={22} className="text-slate-600 mb-2.5" />
                <p className="text-sm text-slate-400 font-medium">No contacts found</p>
                {search && (
                  <p className="text-xs text-slate-600 mt-0.5">Try a different name or email</p>
                )}
              </div>
            ) : (
              filtered.map((c, idx) => {
                const isSelected = selected?.id === c.id;
                const isFocused = focusedIdx === idx;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-l-2 border-indigo-500'
                        : isFocused
                        ? 'bg-slate-800'
                        : 'hover:bg-slate-800/70'
                    }`}
                  >
                    {/* Avatar */}
                    <Avatar name={c.name} src={c.avatar} size="sm" className="shrink-0" />

                    {/* Name & Email */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate transition-colors ${
                        isSelected ? 'text-indigo-300' : isFocused ? 'text-slate-100' : 'text-slate-200'
                      }`}>
                        {c.name}
                      </div>
                      {c.email && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">{c.email}</div>
                      )}
                    </div>

                    {/* Relationship badge */}
                    {c.relationship && (
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isSelected
                          ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-700/80 text-slate-400 border border-slate-600/50'
                      }`}>
                        {c.relationship}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DropdownPortal>
      )}
    </div>
  );
}
