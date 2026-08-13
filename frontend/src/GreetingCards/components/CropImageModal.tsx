import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper, { Area } from 'react-easy-crop';
import { ZoomIn, RotateCw, RefreshCw, Check, X, Circle, Square, Maximize } from 'lucide-react';
import { CropShape } from '../types';

interface CropImageModalProps {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (cropped: { url: string; blob: Blob }) => void;
}

const ZOOM_STEP = 0.1;

async function getCroppedBlob(
  imageSrc: string,
  px: Area,
  rotDeg: number,
  shape: CropShape,
): Promise<{ url: string; blob: Blob }> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });

  const cv = document.createElement('canvas');
  const cx = cv.getContext('2d');
  if (!cx) throw new Error('Canvas 2d not supported');

  const rad = (rotDeg * Math.PI) / 180;
  const bw = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
  const bh = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);

  cv.width = Math.ceil(bw);
  cv.height = Math.ceil(bh);

  if (shape === 'round') {
    cx.beginPath();
    cx.arc(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) / 2, 0, 2 * Math.PI);
    cx.closePath();
    cx.clip();
  }

  cx.translate(bw / 2, bh / 2);
  cx.rotate(rad);
  cx.translate(-image.width / 2, -image.height / 2);
  cx.drawImage(image, 0, 0);

  const c2 = document.createElement('canvas');
  const c2x = c2.getContext('2d');
  if (!c2x) throw new Error('Canvas 2d not supported');

  c2.width = px.width;
  c2.height = px.height;

  if (shape === 'round') {
    c2x.beginPath();
    c2x.arc(px.width / 2, px.height / 2, Math.min(px.width, px.height) / 2, 0, 2 * Math.PI);
    c2x.closePath();
    c2x.clip();
  }

  c2x.drawImage(cv, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);

  return new Promise((resolve) => {
    c2.toBlob((blob) => {
      const url = URL.createObjectURL(blob as Blob);
      resolve({ url, blob: blob as Blob });
    }, 'image/png', 0.92);
  });
}

const CropImageModal = ({ imageSrc, onCancel, onCropComplete }: CropImageModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [shape, setShape] = useState<CropShape>('round');
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropChange = useCallback((loc: { x: number; y: number }) => setCrop(loc), []);
  const onZoomChange = useCallback((z: number) => setZoom(z), []);

  const handleAreaComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, []);

  const handleSave = useCallback(async () => {
    if (!areaPixels) return;
    setBusy(true);
    try {
      const result = await getCroppedBlob(imageSrc, areaPixels, rotation, shape);
      onCropComplete(result);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setBusy(false);
    }
  }, [areaPixels, imageSrc, rotation, shape, onCropComplete]);

  const shapeButtons: { key: CropShape; icon: React.ReactNode; label: string }[] = useMemo(() => [
    { key: 'round', icon: <Circle size={14} />, label: 'Circle' },
    { key: 'rect', icon: <Square size={14} />, label: 'Square' },
  ], []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="w-full max-w-lg bg-[#0F1422] border border-[#334155] rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Maximize size={16} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-[#F8FAFC]">Crop Photo</h3>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 transition-all"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Cropper */}
          <div className="relative h-72 bg-[#0B0F19]">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape={shape}
              showGrid={shape === 'rect'}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={handleAreaComplete}
              objectFit="contain"
            />
          </div>

          {/* Crop shape toggle */}
          <div className="flex items-center gap-2 px-5 py-3 border-t border-[#1E293B]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Shape</span>
            <div className="flex gap-1.5">
              {shapeButtons.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setShape(b.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                    shape === b.key
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-[#1E293B] text-slate-300 border-[#334155] hover:border-indigo-500/40'
                  }`}
                >
                  {b.icon}
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom + Rotation sliders */}
          <div className="space-y-3 px-5 py-3 border-t border-[#1E293B]">
            <div className="flex items-center gap-3">
              <ZoomIn size={14} className="text-slate-400 shrink-0" />
              <input
                type="range" min={1} max={3} step={ZOOM_STEP} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-[10px] text-slate-400 w-10 text-right tabular-nums">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <RotateCw size={14} className="text-slate-400 shrink-0" />
              <input
                type="range" min={0} max={360} step={1} value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-[10px] text-slate-400 w-10 text-right tabular-nums">{rotation}°</span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-all"
            >
              <RefreshCw size={13} />
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
            >
              <Check size={15} />
              {busy ? 'Saving…' : 'Save Crop'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CropImageModal;
