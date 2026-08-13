import React, { useCallback, useRef, useState } from 'react';
import { Upload, Crop, Loader2 } from 'lucide-react';
import CropImageModal from './CropImageModal';

export interface CroppedResult {
  url: string;
  blob: Blob;
  fileName: string;
}

interface ImageUploaderProps {
  label?: string;
  onCropped: (res: CroppedResult) => void;
  compact?: boolean;
}

// Compress a File to a max dimension / quality (pre-crop, keeps upload light)
function compressFile(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        c.toBlob((b) => resolve(b ? new File([b], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

const ImageUploader = ({ label = 'Upload Image', onCropped, compact = false }: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const handleFile = useCallback(async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setCompressing(true);
    try {
      const compressed = await compressFile(file);
      const reader = new FileReader();
      reader.onload = () => setModalSrc(reader.result as string);
      reader.readAsDataURL(compressed);
    } finally {
      setCompressing(false);
    }
  }, []);

  const handleCropComplete = useCallback((res: { url: string; blob: Blob }) => {
    const fileName = `cropped_${Date.now()}.png`;
    onCropped({ url: res.url, blob: res.blob, fileName });
    setModalSrc(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onCropped]);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={compressing}
        className={`w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#334155] text-[#94A3B8] hover:border-indigo-500/50 hover:text-[#F8FAFC] transition-all bg-[#0F1422] ${
          compact ? 'py-2 text-[11px]' : 'py-3 text-xs'
        }`}
      >
        {compressing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {compressing ? 'Optimizing…' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {modalSrc && (
        <CropImageModal
          imageSrc={modalSrc}
          onCancel={() => setModalSrc(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};

export default ImageUploader;
