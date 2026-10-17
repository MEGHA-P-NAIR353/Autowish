import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import ImageUploader, { CroppedResult } from './ImageUploader';
import ImagePreview from './ImagePreview';
import CropToolbar from './CropToolbar';
import { CropShape } from '../types';

import { cardsAPI } from '../../services/greetingCardsAPI';

interface PhotoUploaderProps {
  photoUrl?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

const PhotoUploader = ({ photoUrl, onUpload, onRemove }: PhotoUploaderProps) => {
  const [shape, setShape] = useState<CropShape>('round');
  const [reCropSrc, setReCropSrc] = useState<string | null>(null);

  const handleCropped = async (res: CroppedResult) => {
    // Immediate preview
    onUpload(res.url);

    // Upload to server for persistent storage
    try {
      const file = new File([res.blob], res.fileName || 'photo.jpg', { type: res.blob.type || 'image/jpeg' });
      const uploadRes = await cardsAPI.uploadImage(file);
      const serverUrl = uploadRes.data.url || uploadRes.data.image_url || uploadRes.data.path;
      if (serverUrl) {
        onUpload(serverUrl);
      }
    } catch (err) {
      console.warn('Server photo upload failed, using local preview', err);
    }
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
            <div className='text-[11px] text-black dark:text-slate-400 font-medium'>Recipient photo ready.</div>
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
        <div className='text-[10px] text-amber-600 dark:text-amber-400 font-medium'>
          Re-crop opens the cropper with the current image. Use the modal's zoom, rotate & shape controls.
        </div>
      )}

      {!photoUrl && (
        <div className='flex items-center gap-2 text-[10px] text-black dark:text-slate-400 font-medium'>
          <Upload size={12} />
          Upload → crop (drag, zoom, rotate, circle/square) → auto-applied.
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
