import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import ImageUploader, { CroppedResult } from './ImageUploader';
import ImagePreview from './ImagePreview';
import CropToolbar from './CropToolbar';
import { CropShape } from '../types';

interface PhotoUploaderProps {
  photoUrl?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

const PhotoUploader = ({ photoUrl, onUpload, onRemove }: PhotoUploaderProps) => {
  const [shape, setShape] = useState<CropShape>('round');
  const [reCropSrc, setReCropSrc] = useState<string | null>(null);

  const handleCropped = (res: CroppedResult) => {
    // Store the cropped object URL as the recipient photo
    onUpload(res.url);
  };

  const triggerReCrop = () => {
    // Re-open cropper with the existing image
    if (photoUrl) setReCropSrc(photoUrl);
  };

  return (
    <div className='space-y-3'>
      {photoUrl ? (
        <div className='flex items-center gap-4'>
          <ImagePreview src={photoUrl} shape={shape} size='lg' onRemove={onRemove} onReCrop={triggerReCrop} />
          <div className='flex-1 space-y-2'>
            <div className='text-[11px] text-[#94A3B8]'>Recipient photo ready.</div>
            <CropToolbar
              shape={shape}
              onShapeChange={setShape}
              onReCrop={triggerReCrop}
              onRotate={triggerReCrop}
              onReset={triggerReCrop}
            />
          </div>
        </div>
      ) : (
        <ImageUploader label='Upload & Crop Recipient Photo' onCropped={handleCropped} />
      )}

      {reCropSrc && (
        <div className='text-[10px] text-amber-400/80'>
          Re-crop opens the cropper with the current image. Use the modal's zoom, rotate & shape controls.
        </div>
      )}

      {!photoUrl && (
        <div className='flex items-center gap-2 text-[10px] text-[#64748B]'>
          <Upload size={12} />
          Upload → crop (drag, zoom, rotate, circle/square) → auto-applied.
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
