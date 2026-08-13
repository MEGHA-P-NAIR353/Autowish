import React from 'react';
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

export default function LayerPanel({ state, dispatch }) {
  const elements = [...state.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const toggleVisible = (id, currentVal) => {
    dispatch({ type: 'UPDATE_ELEMENT', id, changes: { visible: currentVal === false } });
  };

  const toggleLock = (id, currentVal) => {
    dispatch({ type: 'UPDATE_ELEMENT', id, changes: { locked: !currentVal } });
  };

  const moveLayer = (index, direction) => {
    const sorted = [...state.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    // Swap zIndices
    const temp = sorted[index].zIndex;
    sorted[index].zIndex = sorted[targetIdx].zIndex;
    sorted[targetIdx].zIndex = temp;

    dispatch({ type: 'REORDER', elements: sorted });
  };

  return (
    <div className="h-full bg-[#111827] flex flex-col">
      <div className="p-3 border-b border-slate-700/50 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-200">Layers</span>
        <span className="text-[10px] text-slate-500 font-semibold">{elements.length} elements</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
        {elements.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-slate-500">No elements on card</div>
        ) : (
          elements.map((el, idx) => {
            const sortedIdx = state.elements.findIndex(e => e.id === el.id);
            const isSelected = state.selectedId === el.id;

            return (
              <div
                key={el.id}
                onClick={() => dispatch({ type: 'SELECT', id: el.id })}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border text-xs ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                    : 'bg-slate-800/40 border-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] bg-slate-700 text-slate-400 w-5 h-5 rounded flex items-center justify-center font-bold">
                    {el.type === 'text' ? 'T' : el.type === 'image' ? 'IMG' : el.type === 'shape' ? 'SHP' : '☺'}
                  </span>
                  <span className="truncate font-medium capitalize">
                    {el.type === 'text' ? (el.content || 'Text Element') : el.type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {/* Layer reordering */}
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(sortedIdx, 1); }}
                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-all"
                    title="Bring Forward"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(sortedIdx, -1); }}
                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-all"
                    title="Send Backward"
                  >
                    <ChevronDown size={12} />
                  </button>

                  {/* Visibility & Lock toggles */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisible(el.id, el.visible); }}
                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-all"
                  >
                    {el.visible !== false ? <Eye size={12} /> : <EyeOff size={12} className="text-rose-400" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(el.id, el.locked); }}
                    className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-all"
                  >
                    {el.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_ELEMENT', id: el.id }); }}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
