import React from 'react';
import { CARD_SIZES } from './index';
import ContactSelector from '../../components/ContactSelector';
import ContactCard from '../../components/ContactCard';

const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Playfair Display', 'Dancing Script', 'Montserrat',
  'Oswald', 'Raleway', 'Pacifico', 'Great Vibes', 'Nunito', 'Poppins',
  'Georgia', 'Times New Roman', 'Arial', 'Courier New'
];

const SectionHeader = ({ title }) => (
  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 mt-4 first:mt-0">{title}</div>
);

const SliderRow = ({ label, value, min, max, step = 1, onChange, unit = '' }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[11px] text-slate-400">
      <span>{label}</span>
      <span className="text-white font-semibold">{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
    />
  </div>
);

const ToggleBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
      active ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
    }`}
  >
    {children}
  </button>
);

export default function RightSidebar({ state, dispatch, selectedElement, contacts, loadingContacts, onSelectContact }) {
  const [activeSection, setActiveSection] = React.useState('card');

  const setProp = (key, value) => dispatch({ type: 'SET_CARD_PROP', key, value });

  const setElProp = (changes) => {
    if (!selectedElement) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: selectedElement.id, changes });
  };

  const selectedContact = contacts.find(c => c.id === state.selectedContactId);

  const size = CARD_SIZES[state.cardSize] || CARD_SIZES.instagram_square;

  return (
    <div className="w-72 flex-shrink-0 bg-[#111827] border-l border-slate-700/50 flex flex-col overflow-hidden">
      {/* Section toggle */}
      <div className="flex p-2 gap-1 border-b border-slate-700/50">
        {['card', 'element'].map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeSection === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {s === 'card' ? '🎨 Card' : '✏️ Element'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
        {/* ── Card Properties ── */}
        {activeSection === 'card' && (
          <>
            <SectionHeader title="Recipient" />
            {loadingContacts ? (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50">
                <div className="text-xs text-slate-400">Loading contacts...</div>
              </div>
            ) : (
              <>
                <ContactSelector 
                  contacts={contacts} 
                  selected={selectedContact} 
                  onSelect={onSelectContact} 
                />
                <ContactCard contact={selectedContact} />
              </>
            )}

            <SectionHeader title="Card Size" />
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(CARD_SIZES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    setProp('cardSize', key);
                    setProp('cardWidth', val.w);
                    setProp('cardHeight', val.h);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                    state.cardSize === key
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>

            {state.cardSize === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Width px</label>
                  <input type="number" value={state.cardWidth} min={200} max={2000}
                    onChange={(e) => setProp('cardWidth', Number(e.target.value))}
                    className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Height px</label>
                  <input type="number" value={state.cardHeight} min={200} max={2000}
                    onChange={(e) => setProp('cardHeight', Number(e.target.value))}
                    className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}

            <SectionHeader title="Card Theme" />
            <div className="grid grid-cols-2 gap-1.5">
              {['light', 'dark', 'gradient', 'glass'].map(t => (
                <ToggleBtn key={t} active={state.cardTheme === t} onClick={() => setProp('cardTheme', t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </ToggleBtn>
              ))}
            </div>

            <SectionHeader title="Background" />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.backgroundColor?.startsWith('#') ? state.backgroundColor : '#1a1a2e'}
                onChange={(e) => setProp('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
              />
              <span className="text-xs text-slate-400 flex-1">{state.backgroundColor}</span>
              {state.backgroundImage && (
                <button onClick={() => setProp('backgroundImage', null)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 transition-all">
                  Remove
                </button>
              )}
            </div>

            <SliderRow label="Background Blur" value={state.backgroundBlur} min={0} max={20}
              onChange={(v) => setProp('backgroundBlur', v)} unit="px" />
            <SliderRow label="Opacity" value={Math.round((state.backgroundOpacity ?? 1) * 100)} min={10} max={100}
              onChange={(v) => setProp('backgroundOpacity', v / 100)} unit="%" />

            <SectionHeader title="Border & Shadow" />
            <SliderRow label="Border Radius" value={state.borderRadius} min={0} max={50}
              onChange={(v) => setProp('borderRadius', v)} unit="px" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Drop Shadow</span>
              <button
                onClick={() => setProp('shadow', !state.shadow)}
                className={`w-10 h-5 rounded-full transition-all relative ${state.shadow ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${state.shadow ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </>
        )}

        {/* ── Element Properties ── */}
        {activeSection === 'element' && selectedElement && (
          <>
            <div className="text-xs text-slate-400 bg-slate-800/60 px-3 py-2 rounded-lg">
              Selected: <span className="text-indigo-400 font-semibold capitalize">{selectedElement.type}</span>
            </div>

            {/* Common props */}
            <SectionHeader title="Position & Size" />
            <div className="grid grid-cols-2 gap-2">
              {[['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-500 block mb-1">{label}</label>
                  <input type="number" value={Math.round(selectedElement[key] || 0)}
                    onChange={(e) => setElProp({ [key]: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <SliderRow label="Rotation" value={selectedElement.rotation || 0} min={-180} max={180}
              onChange={(v) => setElProp({ rotation: v })} unit="°" />
            <SliderRow label="Opacity" value={Math.round((selectedElement.opacity ?? 1) * 100)} min={0} max={100}
              onChange={(v) => setElProp({ opacity: v / 100 })} unit="%" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Lock Element</span>
              <button onClick={() => setElProp({ locked: !selectedElement.locked })}
                className={`w-10 h-5 rounded-full transition-all relative ${selectedElement.locked ? 'bg-amber-600' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${selectedElement.locked ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Text specific */}
            {selectedElement.type === 'text' && (
              <>
                <SectionHeader title="Typography" />
                <select
                  value={selectedElement.fontFamily || 'Inter'}
                  onChange={(e) => setElProp({ fontFamily: e.target.value })}
                  className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-2 border border-slate-700 focus:border-indigo-500 outline-none"
                >
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <SliderRow label="Font Size" value={selectedElement.fontSize || 20} min={8} max={120}
                  onChange={(v) => setElProp({ fontSize: v })} unit="px" />

                <div className="flex gap-2 flex-wrap">
                  <ToggleBtn active={selectedElement.fontWeight === 'bold'} onClick={() => setElProp({ fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}>B</ToggleBtn>
                  <ToggleBtn active={selectedElement.fontStyle === 'italic'} onClick={() => setElProp({ fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}>I</ToggleBtn>
                  <ToggleBtn active={selectedElement.textDecoration === 'underline'} onClick={() => setElProp({ textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}>U</ToggleBtn>
                  {['left','center','right'].map(a => (
                    <ToggleBtn key={a} active={selectedElement.textAlign === a} onClick={() => setElProp({ textAlign: a })}>
                      {a === 'left' ? '⬅' : a === 'center' ? '⬆' : '➡'}
                    </ToggleBtn>
                  ))}
                </div>

                <SliderRow label="Letter Spacing" value={selectedElement.letterSpacing || 0} min={-5} max={20}
                  onChange={(v) => setElProp({ letterSpacing: v })} unit="px" />
                <SliderRow label="Line Height" value={selectedElement.lineHeight || 1.4} min={0.8} max={3} step={0.1}
                  onChange={(v) => setElProp({ lineHeight: v })} />

                <SectionHeader title="Text Color" />
                <div className="flex items-center gap-2">
                  <input type="color" value={selectedElement.color || '#ffffff'}
                    onChange={(e) => setElProp({ color: e.target.value, gradient: false })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
                  />
                  <span className="text-xs text-slate-400 flex-1">{selectedElement.color}</span>
                </div>

                <SectionHeader title="Effects" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Text Shadow</span>
                    <button onClick={() => setElProp({ shadow: !selectedElement.shadow })}
                      className={`w-10 h-5 rounded-full transition-all relative ${selectedElement.shadow ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${selectedElement.shadow ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Gradient Text</span>
                    <button onClick={() => setElProp({ gradient: !selectedElement.gradient })}
                      className={`w-10 h-5 rounded-full transition-all relative ${selectedElement.gradient ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${selectedElement.gradient ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {selectedElement.gradient && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">From</label>
                        <input type="color" value={selectedElement.gradientFrom || '#ffffff'}
                          onChange={(e) => setElProp({ gradientFrom: e.target.value })}
                          className="w-full h-7 rounded cursor-pointer border border-slate-600" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">To</label>
                        <input type="color" value={selectedElement.gradientTo || '#a78bfa'}
                          onChange={(e) => setElProp({ gradientTo: e.target.value })}
                          className="w-full h-7 rounded cursor-pointer border border-slate-600" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Stroke</span>
                    <button onClick={() => setElProp({ stroke: !selectedElement.stroke })}
                      className={`w-10 h-5 rounded-full transition-all relative ${selectedElement.stroke ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${selectedElement.stroke ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {selectedElement.stroke && (
                    <div className="flex items-center gap-2">
                      <input type="color" value={selectedElement.strokeColor || '#000000'}
                        onChange={(e) => setElProp({ strokeColor: e.target.value })}
                        className="w-8 h-7 rounded cursor-pointer border border-slate-600" />
                      <span className="text-[10px] text-slate-400">Stroke Color</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Image specific */}
            {selectedElement.type === 'image' && (
              <>
                <SectionHeader title="Image Adjustments" />
                <SliderRow label="Brightness" value={selectedElement.brightness || 100} min={0} max={200}
                  onChange={(v) => setElProp({ brightness: v })} unit="%" />
                <SliderRow label="Contrast" value={selectedElement.contrast || 100} min={0} max={200}
                  onChange={(v) => setElProp({ contrast: v })} unit="%" />
                <SliderRow label="Saturation" value={selectedElement.saturation || 100} min={0} max={200}
                  onChange={(v) => setElProp({ saturation: v })} unit="%" />
                <SliderRow label="Border Radius" value={selectedElement.borderRadius || 0} min={0} max={50}
                  onChange={(v) => setElProp({ borderRadius: v })} unit="%" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Image Shadow</span>
                  <button onClick={() => setElProp({ shadow: !selectedElement.shadow })}
                    className={`w-10 h-5 rounded-full transition-all relative ${selectedElement.shadow ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${selectedElement.shadow ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </>
            )}

            {/* Shape specific */}
            {selectedElement.type === 'shape' && (
              <>
                <SectionHeader title="Shape" />
                <div className="flex gap-2">
                  {['rectangle','circle'].map(s => (
                    <ToggleBtn key={s} active={selectedElement.shape === s} onClick={() => setElProp({ shape: s })}>
                      {s === 'circle' ? '●' : '▬'} {s}
                    </ToggleBtn>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={selectedElement.fill || '#7c3aed'}
                    onChange={(e) => setElProp({ fill: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-600" />
                  <span className="text-xs text-slate-400">Fill Color</span>
                </div>
                <SliderRow label="Corner Radius" value={selectedElement.borderRadius || 0} min={0} max={50}
                  onChange={(v) => setElProp({ borderRadius: v })} unit="px" />
              </>
            )}

            {/* Emoji size */}
            {(selectedElement.type === 'emoji' || selectedElement.type === 'sticker') && (
              <>
                <SectionHeader title="Emoji" />
                <SliderRow label="Size" value={selectedElement.fontSize || 48} min={12} max={200}
                  onChange={(v) => setElProp({ fontSize: v })} unit="px" />
              </>
            )}
          </>
        )}

        {activeSection === 'element' && !selectedElement && (
          <div className="text-center py-12 text-slate-500 text-sm">
            <div className="text-3xl mb-3">👆</div>
            <p>Click an element on the card to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
}
