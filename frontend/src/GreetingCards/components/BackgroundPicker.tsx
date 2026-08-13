import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cardsAPI } from '../../services/greetingCardsAPI';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#0F172A', '#1E293B', '#1E1B4B', '#312E81', '#4C1D95',
  '#164E63', '#14532D', '#7C2D12', '#881337', '#020617',
];

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #0f172a, #1e293b)',
  'linear-gradient(135deg, #1e1b4b, #4c1d95)',
  'linear-gradient(135deg, #7c3aed, #4f46e5)',
  'linear-gradient(135deg, #f43f5e, #ec4899)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #0ea5e9, #2563eb)',
  'linear-gradient(135deg, #fc466b, #3f5efb)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #0284c7)',
  'linear-gradient(135deg, #84cc16, #22c55e)',
];

const PRESET_PATTERNS = [
  { label: 'Dots', value: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)' },
  { label: 'Grid', value: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)' },
  { label: 'Diagonal', value: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)' },
  { label: 'Waves', value: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)' },
];

interface BackgroundPickerProps {
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundPattern?: string;
  backgroundImage?: string;
  onChange: (updates: {
    background_color?: string;
    background_gradient?: string;
    background_pattern?: string;
    background_image?: string;
  }) => void;
}

export default function BackgroundPicker({
  backgroundColor,
  backgroundGradient,
  backgroundPattern,
  backgroundImage,
  onChange,
}: BackgroundPickerProps) {
  const [activeTab, setActiveTab] = useState<'Colors' | 'Gradients' | 'Patterns' | 'Upload'>('Colors');
  const [uploading, setUploading] = useState(false);
  // Local preview URL shown instantly
  const [localBgPreview, setLocalBgPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayBg = backgroundImage || localBgPreview;

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast.error('Unsupported format. Use PNG, JPG, WEBP or SVG.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File too large. Max 8 MB for backgrounds.');
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setLocalBgPreview(objectUrl);
    onChange({ background_image: objectUrl, background_gradient: '', background_pattern: '' });

    setUploading(true);
    try {
      const res = await cardsAPI.uploadImage(file);
      const serverUrl = res.data.image_url || res.data.url || res.data.file_url;
      if (serverUrl) {
        onChange({ background_image: serverUrl, background_gradient: '', background_pattern: '' });
        setLocalBgPreview(null);
        toast.success('Background uploaded!');
      }
    } catch {
      // Keep local preview — already set above
      toast.error('Server upload failed — using local preview.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [onChange]);

  const handleRemoveBg = () => {
    setLocalBgPreview(null);
    onChange({ background_image: '', background_gradient: '', background_pattern: '' });
  };

  const tabs = ['Colors', 'Gradients', 'Patterns', 'Upload'] as const;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-[#0F172A] p-1 rounded-xl border border-[#334155]">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all duration-200 ${
              activeTab === tab
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Colors */}
      {activeTab === 'Colors' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <input
                type="color"
                value={backgroundColor?.startsWith('#') ? backgroundColor : '#1e293b'}
                onChange={(e) =>
                  onChange({
                    background_color: e.target.value,
                    background_gradient: '',
                    background_pattern: '',
                    background_image: '',
                  })
                }
                className="w-9 h-9 rounded-lg border border-[#334155] cursor-pointer bg-[#111827] p-0.5"
                aria-label="Custom background color"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 flex-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    onChange({
                      background_color: color,
                      background_gradient: '',
                      background_pattern: '',
                      background_image: '',
                    })
                  }
                  className={`h-7 rounded-lg border-2 transition-all duration-200 ${
                    backgroundColor === color
                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 scale-105'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Background color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gradients */}
      {activeTab === 'Gradients' && (
        <div className="grid grid-cols-4 gap-2">
          {PRESET_GRADIENTS.map((gradient) => (
            <button
              key={gradient}
              type="button"
              onClick={() => onChange({ background_gradient: gradient, background_image: '', background_pattern: '' })}
              className={`h-12 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                backgroundGradient === gradient
                  ? 'border-indigo-400 ring-2 ring-indigo-500/30 scale-105'
                  : 'border-transparent'
              }`}
              style={{ background: gradient }}
              aria-label="Select gradient"
            />
          ))}
        </div>
      )}

      {/* Patterns */}
      {activeTab === 'Patterns' && (
        <div className="grid grid-cols-2 gap-3">
          {PRESET_PATTERNS.map((pattern) => (
            <button
              key={pattern.label}
              type="button"
              onClick={() => onChange({ background_pattern: pattern.value, background_image: '' })}
              className={`h-14 rounded-xl border-2 relative overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                backgroundPattern === pattern.value
                  ? 'border-indigo-400 ring-2 ring-indigo-500/30'
                  : 'border-[#334155]'
              }`}
            >
              <div className="absolute inset-0 bg-[#1e293b]" />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: pattern.value,
                  backgroundSize: '14px 14px',
                }}
              />
              <span className="absolute bottom-1.5 left-2 text-[9px] text-slate-300 font-semibold bg-black/50 px-1.5 py-0.5 rounded">
                {pattern.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Upload */}
      {activeTab === 'Upload' && (
        <div>
          {displayBg ? (
            <div className="space-y-2">
              {/* Preview thumbnail */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[#334155] bg-[#111827]">
                <img
                  src={displayBg}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {uploading && (
                  <div className="absolute inset-0 bg-[#0F172A]/70 backdrop-blur-sm flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-indigo-400" />
                    <span className="text-[10px] text-slate-300">Uploading...</span>
                  </div>
                )}
                {!uploading && (
                  <button
                    type="button"
                    onClick={handleRemoveBg}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600/90 text-slate-200 hover:text-white transition-all border border-white/10"
                    title="Remove background"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-1.5 text-[10px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] bg-[#111827] hover:bg-[#1E293B] border border-[#334155] rounded-xl transition-all"
              >
                Replace Background
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center text-center border-2 border-dashed border-[#334155] rounded-xl py-8 hover:border-indigo-500/60 hover:bg-[#111827]/60 transition-all duration-200"
            >
              {uploading ? (
                <>
                  <Loader2 size={22} className="text-indigo-400 animate-spin mb-2" />
                  <span className="text-xs text-[#94A3B8]">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-[#94A3B8] mb-2" />
                  <span className="text-xs font-semibold text-[#F8FAFC]">Upload Background Image</span>
                  <span className="text-[10px] text-[#94A3B8] mt-1">PNG, JPG, WEBP · Max 8 MB</span>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
