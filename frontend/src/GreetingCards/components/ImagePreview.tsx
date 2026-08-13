import React from 'react';
import { X, Maximize } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  shape?: 'round' | 'rect' | 'free';
  onRemove?: () => void;
  onReCrop?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const ImagePreview = ({ src, alt = 'Uploaded', shape = 'round', onRemove, onReCrop, size = 'md' }: ImagePreviewProps) => {
  const radius = shape === 'round' ? 'rounded-full' : shape === 'free' ? 'rounded-lg' : 'rounded-xl';
  return (
    <div className='relative group inline-block'>
      <div className={`${sizeMap[size]} ${radius} overflow-hidden border border-[#334155] shadow-lg shadow-black/30`}>
        <img src={src} alt={alt} className='w-full h-full object-cover' />
      </div>
      <div className='absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 bg-black/50 transition-all rounded-xl'>
        {onReCrop && (
          <button type='button' onClick={onReCrop} className='p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all' aria-label='Recrop'>
            <Maximize size={13} />
          </button>
        )}
        {onRemove && (
          <button type='button' onClick={onRemove} className='p-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-white transition-all' aria-label='Remove'>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;
