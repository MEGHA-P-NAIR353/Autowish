import React from 'react';
import { Crop, RotateCw, RefreshCw, Circle, Square } from 'lucide-react';
import { CropShape } from '../types';

interface CropToolbarProps {
  shape: CropShape;
  onShapeChange: (s: CropShape) => void;
  onReCrop: () => void;
  onRotate: () => void;
  onReset: () => void;
}

const CropToolbar = ({ shape, onShapeChange, onReCrop, onRotate, onReset }: CropToolbarProps) => {
  const btn = 'p-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 transition-all';
  return (
    <div className='flex items-center gap-1.5 flex-wrap'>
      <button type='button' onClick={onReCrop} className={`${btn} hover:text-indigo-400`} aria-label='Recrop' title='Recrop'>
        <Crop size={14} />
      </button>
      <button type='button' onClick={onRotate} className={`${btn} hover:text-indigo-400`} aria-label='Rotate' title='Rotate'>
        <RotateCw size={14} />
      </button>
      <button type='button' onClick={onReset} className={`${btn} hover:text-indigo-400`} aria-label='Reset' title='Reset'>
        <RefreshCw size={14} />
      </button>
      <div className='w-px h-5 bg-[#334155] mx-0.5' />
      <button
        type='button'
        onClick={() => onShapeChange('round')}
        className={`${btn} ${shape === 'round' ? 'text-indigo-400 bg-indigo-600/20' : ''}`}
        aria-label='Circle crop' title='Circle crop'
      >
        <Circle size={14} />
      </button>
      <button
        type='button'
        onClick={() => onShapeChange('rect')}
        className={`${btn} ${shape === 'rect' ? 'text-indigo-400 bg-indigo-600/20' : ''}`}
        aria-label='Square crop' title='Square crop'
      >
        <Square size={14} />
      </button>
    </div>
  );
};

export default CropToolbar;
