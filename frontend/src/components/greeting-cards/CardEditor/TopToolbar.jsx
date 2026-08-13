import React, { useState } from 'react';
import {
  Undo2, Redo2, Copy, Trash2, Eye, Sparkles, Check, Download,
  Layers, ChevronLeft, Save, Monitor, Tablet, Phone, Mail, Printer
} from 'lucide-react';

const PREVIEW_MODES = [
  { mode: 'desktop', label: 'Desktop', icon: Monitor },
  { mode: 'tablet', label: 'Tablet', icon: Tablet },
  { mode: 'mobile', label: 'Mobile', icon: Phone },
  { mode: 'email', label: 'Email', icon: Mail },
  { mode: 'print', label: 'Print', icon: Printer },
];

export default function TopToolbar({
  state, dispatch, saving, zoom, setZoom,
  previewMode, setPreviewMode, showLayers, setShowLayers,
  onSave, onSend, onExport, navigate
}) {
  const [editingTitle, setEditingTitle] = useState(false);

  const handleTitleChange = (e) => {
    dispatch({ type: 'SET_CARD_PROP', key: 'title', value: e.target.value });
  };

  const handleDuplicate = () => {
    if (state.selectedId) {
      dispatch({ type: 'DUPLICATE_ELEMENT', id: state.selectedId });
      toast.success('Element duplicated');
    }
  };

  const handleDelete = () => {
    if (state.selectedId) {
      dispatch({ type: 'DELETE_ELEMENT', id: state.selectedId });
      toast.success('Element deleted');
    }
  };

  return (
    <div className="h-14 bg-[#111827] border-b border-slate-700/50 flex items-center justify-between px-4 z-30 select-none flex-shrink-0">
      {/* Left controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/greeting-cards')}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Card Title */}
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <input
              type="text"
              value={state.title}
              onChange={handleTitleChange}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false); }}
              autoFocus
              className="bg-slate-850 text-white text-sm font-semibold rounded-lg px-2 py-1 border border-slate-700 outline-none focus:border-indigo-500"
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              className="text-white text-sm font-semibold cursor-pointer hover:text-indigo-400 transition-all max-w-[150px] truncate"
            >
              {state.title || 'Untitled Card'}
            </h1>
          )}
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full capitalize font-semibold border border-slate-700/30">
            {state.occasion}
          </span>
        </div>
      </div>

      {/* Center controls: Undo/Redo & Element actions */}
      <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.historyIndex <= 0}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={state.historyIndex >= state.history.length - 1}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={handleDuplicate}
          disabled={!state.selectedId}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Duplicate Element (Ctrl+D)"
        >
          <Copy size={15} />
        </button>
        <button
          onClick={handleDelete}
          disabled={!state.selectedId}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Delete Element (Delete)"
        >
          <Trash2 size={15} />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-1" />

        <button
          onClick={() => setShowLayers(!showLayers)}
          className={`p-2 rounded-lg transition-all ${
            showLayers ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Layers"
        >
          <Layers size={15} />
        </button>
      </div>

      {/* Preview mode selectors */}
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
        {PREVIEW_MODES.map((pm) => (
          <button
            key={pm.mode}
            onClick={() => setPreviewMode(pm.mode)}
            className={`p-2 rounded-lg transition-all ${
              previewMode === pm.mode
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={`Preview: ${pm.label}`}
          >
            <pm.icon size={14} />
          </button>
        ))}
      </div>

      {/* Right controls: Save/Export/Send */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave('draft')}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          {saving ? <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
          Save Draft
        </button>

        <button
          onClick={onSend}
          disabled={saving || !state.selectedContactId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail size={13} />
          Publish & Send
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-500/20 transition-all"
        >
          <Download size={13} />
          Export
        </button>
      </div>
    </div>
  );
}
