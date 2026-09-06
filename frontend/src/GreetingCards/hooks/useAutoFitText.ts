import { useMemo } from 'react';
import {
  findOptimalFontSizeBinarySearch,
  AutoFitResult,
  DEFAULT_MIN_FONT_SIZE,
  DEFAULT_MAX_FONT_SIZE,
} from '../utils/textMeasurement';

export interface UseAutoFitTextParams {
  text?: string;
  targetWidth: number;
  targetHeight: number;
  maxFontSize?: number;
  minFontSize?: number;
  fontFamily?: string;
  lineHeight?: number | string;
  fontWeight?: string | number;
  letterSpacing?: string;
  paddingX?: number;
}

/**
 * Custom React hook to automatically calculate the optimal font size for a text block
 * using binary search text measurement. Ensures text fits inside the designated container
 * without requiring scroll containers or truncating content.
 */
export function useAutoFitText({
  text = '',
  targetWidth,
  targetHeight,
  maxFontSize = DEFAULT_MAX_FONT_SIZE,
  minFontSize = DEFAULT_MIN_FONT_SIZE,
  fontFamily = 'Inter',
  lineHeight = 1.65,
  fontWeight = '400',
  letterSpacing = 'normal',
  paddingX = 0,
}: UseAutoFitTextParams): AutoFitResult {
  return useMemo(() => {
    return findOptimalFontSizeBinarySearch({
      text,
      targetWidth,
      targetHeight,
      maxFontSize,
      minFontSize,
      fontFamily,
      lineHeight,
      fontWeight,
      letterSpacing,
      paddingX,
    });
  }, [
    text,
    targetWidth,
    targetHeight,
    maxFontSize,
    minFontSize,
    fontFamily,
    lineHeight,
    fontWeight,
    letterSpacing,
    paddingX,
  ]);
}
