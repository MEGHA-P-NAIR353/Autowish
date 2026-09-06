import React, { memo, ForwardedRef } from 'react';
import { GreetingCardData } from '../types';
import GreetingCardRenderer from './GreetingCardRenderer';
import { AutoFitResult } from '../utils/textMeasurement';

export interface LivePreviewProps {
  cardData: GreetingCardData;
  className?: string;
  onAutoFitResult?: (result: AutoFitResult) => void;
  showOverflowWarningBadge?: boolean;
}

/**
 * LivePreview wrapper maintaining full backwards-compatibility.
 * Delegates rendering to the canonical GreetingCardRenderer so that
 * the editor preview and exported PNG always use identical layout & auto-fit calculations.
 */
const LivePreview = React.forwardRef(
  (
    { cardData, className = '', onAutoFitResult, showOverflowWarningBadge = true }: LivePreviewProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <div className={`w-full flex items-center justify-center ${className}`}>
        <div className="w-full max-w-[460px]">
          <GreetingCardRenderer
            ref={ref}
            cardData={cardData}
            onAutoFitResult={onAutoFitResult}
            showOverflowWarningBadge={showOverflowWarningBadge}
          />
        </div>
      </div>
    );
  }
);

LivePreview.displayName = 'LivePreview';
export default memo(LivePreview);
