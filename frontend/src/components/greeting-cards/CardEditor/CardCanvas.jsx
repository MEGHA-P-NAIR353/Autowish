import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CARD_SIZES, makeElement } from './index';

const SNAP_THRESHOLD = 8;

function snapTo(val, targets) {
  for (const t of targets) {
    if (Math.abs(val - t) < SNAP_THRESHOLD) return t;
  }
  return val;
}

// ─── Individual draggable element ─────────────────────────────────────────────
function CanvasElement({ el, isSelected, onSelect, onUpdate, onUpdateImmediate, cardW, cardH, zoom }) {
  const elRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const [editing, setEditing] = useState(false);

  // Drag
  const startDrag = useCallback((e) => {
    if (el.locked || editing) return;
    e.stopPropagation();
    onSelect(el.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = el.x, oy = el.y;

    const onMove = (mv) => {
      const dx = (mv.clientX - startX) / zoom;
      const dy = (mv.clientY - startY) / zoom;
      const snapTargetsX = [0, cardW / 2 - el.width / 2, cardW - el.width];
      const snapTargetsY = [0, cardH / 2 - el.height / 2, cardH - el.height];
      const newX = snapTo(ox + dx, snapTargetsX);
      const newY = snapTo(oy + dy, snapTargetsY);
      onUpdateImmediate(el.id, { x: newX, y: newY });
    };
    const onUp = () => {
      onUpdate(el.id, { x: el.x, y: el.y });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [el, editing, zoom, onSelect, onUpdate, onUpdateImmediate, cardW, cardH]);

  // Resize
  const startResize = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const ow = el.width, oh = el.height;

    const onMove = (mv) => {
      const dw = (mv.clientX - startX) / zoom;
      const dh = (mv.clientY - startY) / zoom;
      onUpdateImmediate(el.id, { width: Math.max(40, ow + dw), height: Math.max(20, oh + dh) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [el, zoom, onUpdateImmediate]);

  const style = {
    position: 'absolute',
    left: el.x, top: el.y,
    width: el.width, height: el.height,
    transform: `rotate(${el.rotation || 0}deg)`,
    opacity: el.visible === false ? 0 : el.opacity ?? 1,
    cursor: el.locked ? 'not-allowed' : 'move',
    zIndex: el.zIndex || 1,
    userSelect: 'none',
    boxSizing: 'border-box',
  };

  const renderContent = () => {
    if (el.type === 'text') {
      const gradientStyle = el.gradient
        ? { background: `linear-gradient(135deg, ${el.gradientFrom}, ${el.gradientTo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
        : {};
      return (
        <div
          contentEditable={editing}
          suppressContentEditableWarning
          onDoubleClick={() => { if (!el.locked) setEditing(true); }}
          onBlur={(e) => { setEditing(false); onUpdate(el.id, { content: e.target.innerText }); }}
          style={{
            width: '100%', height: '100%',
            fontFamily: `'${el.fontFamily || 'Inter'}', 'Noto Sans', 'Noto Sans Malayalam', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', sans-serif`,
            fontSize: el.fontSize || 20,
            fontWeight: el.fontWeight || 'normal',
            fontStyle: el.fontStyle || 'normal',
            textDecoration: el.textDecoration || 'none',
            textAlign: el.textAlign || 'center',
            color: el.gradient ? 'transparent' : (el.color || '#fff'),
            letterSpacing: el.letterSpacing || 0,
            lineHeight: el.lineHeight || 1.6,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            outline: 'none',
            display: 'flex', alignItems: 'center', justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center',
            textShadow: el.shadow ? '2px 2px 8px rgba(0,0,0,0.8)' : 'none',
            WebkitTextStroke: el.stroke ? `1px ${el.strokeColor || '#000'}` : '0px',
            ...gradientStyle,
          }}
        >
          {el.content || 'Edit me'}
        </div>
      );
    }
    if (el.type === 'emoji' || el.type === 'sticker') {
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: el.fontSize || 48,
          lineHeight: 1,
        }}>
          {el.content}
        </div>
      );
    }
    if (el.type === 'image') {
      return el.src ? (
        <img
          src={el.src} alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            borderRadius: el.borderRadius || 0,
            filter: `brightness(${el.brightness||100}%) contrast(${el.contrast||100}%) saturate(${el.saturation||100}%)`,
            boxShadow: el.shadow ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
          }}
          draggable={false}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '2px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          Image
        </div>
      );
    }
    if (el.type === 'shape') {
      return (
        <div style={{
          width: '100%', height: '100%',
          background: el.fill || '#7c3aed',
          borderRadius: el.shape === 'circle' ? '50%' : (el.borderRadius || 8),
          border: el.stroke ? `2px solid ${el.strokeColor || '#a78bfa'}` : 'none',
        }} />
      );
    }
    return null;
  };

  return (
    <motion.div
      ref={elRef}
      style={style}
      animate={{ scale: isSelected ? 1 : 1 }}
      onMouseDown={startDrag}
    >
      {renderContent()}
      {/* Selection outline */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: -2,
          border: '2px solid #6366f1',
          borderRadius: (el.type === 'shape' && el.shape === 'circle') ? '50%' : 4,
          pointerEvents: 'none',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.3)',
        }}>
          {/* Resize handle */}
          <div
            onMouseDown={startResize}
            style={{
              position: 'absolute', right: -6, bottom: -6,
              width: 12, height: 12,
              background: '#6366f1', borderRadius: 2, cursor: 'se-resize',
              pointerEvents: 'all',
            }}
          />
          {/* Rotation hint */}
          <div style={{
            position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
            fontSize: 10, color: '#6366f1', background: 'rgba(0,0,0,0.7)',
            padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {el.type === 'text' ? 'Double-click to edit' : el.type}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────
export default function CardCanvas({ state, dispatch, zoom, setZoom, canvasRef, previewMode }) {
  const size = CARD_SIZES[state.cardSize] || CARD_SIZES.instagram_square;
  const W = state.cardWidth || size.w;
  const H = state.cardHeight || size.h;

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) dispatch({ type: 'SELECT', id: null });
  };

  const onUpdate = useCallback((id, changes) => {
    dispatch({ type: 'UPDATE_ELEMENT', id, changes });
  }, [dispatch]);

  const onUpdateImmediate = useCallback((id, changes) => {
    dispatch({ type: 'UPDATE_ELEMENT', id, changes, noHistory: true });
  }, [dispatch]);

  const onSelect = useCallback((id) => {
    dispatch({ type: 'SELECT', id });
  }, [dispatch]);

  // Background style
  const bgStyle = {};
  if (state.backgroundImage) {
    bgStyle.backgroundImage = `url(${state.backgroundImage})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
    if (state.backgroundBlur > 0) bgStyle.filter = `blur(${state.backgroundBlur}px)`;
    bgStyle.opacity = state.backgroundOpacity ?? 1;
  }

  const previewScale = previewMode === 'mobile' ? 0.55 : previewMode === 'tablet' ? 0.75 : 1;

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-auto"
      style={{ background: 'radial-gradient(circle at center, #111827 0%, #060a14 100%)' }}
    >
      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 flex gap-2 z-20">
        {[0.5, 0.75, 1, 1.25, 1.5].map(z => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              zoom === z ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
      </div>

      {/* Card */}
      <div
        style={{
          transform: `scale(${zoom * previewScale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
        }}
      >
        <div
          ref={canvasRef}
          style={{
            width: W, height: H,
            position: 'relative',
            background: state.backgroundColor || '#1a1a2e',
            borderRadius: state.borderRadius || 16,
            boxShadow: state.shadow ? '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)' : 'none',
            overflow: 'hidden',
          }}
          onClick={handleCanvasClick}
        >
          {/* Background layer */}
          {state.backgroundImage && (
            <div style={{ position: 'absolute', inset: 0, ...bgStyle }} />
          )}

          {/* Snap guide lines (center) */}
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />

          {/* Elements sorted by zIndex */}
          {[...state.elements]
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map(el => (
              <CanvasElement
                key={el.id}
                el={el}
                isSelected={state.selectedId === el.id}
                onSelect={onSelect}
                onUpdate={onUpdate}
                onUpdateImmediate={onUpdateImmediate}
                cardW={W}
                cardH={H}
                zoom={zoom}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
