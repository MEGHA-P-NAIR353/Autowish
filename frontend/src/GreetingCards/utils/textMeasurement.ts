// Font fallbacks for full multi-language support
export const UNICODE_FONT_FALLBACKS = `'Noto Sans', 'Noto Sans Malayalam', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', sans-serif`;

export interface MeasureTextOptions {
  text: string;
  width: number;
  fontSize: number;
  fontFamily?: string;
  lineHeight?: number | string;
  fontWeight?: string | number;
  letterSpacing?: string;
  paddingX?: number;
}

export interface AutoFitOptions {
  text: string;
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

export interface AutoFitResult {
  fittedFontSize: number;
  fits: boolean;
  overflow: boolean;
}

export const DEFAULT_MIN_FONT_SIZE = 11;
export const DEFAULT_MAX_FONT_SIZE = 32;

// Singleton measurement container to prevent DOM churn
let measurementContainer: HTMLDivElement | null = null;

function getMeasurementContainer(): HTMLDivElement {
  if (typeof document === 'undefined') {
    throw new Error('textMeasurement can only run in a browser environment');
  }

  if (!measurementContainer || !document.body.contains(measurementContainer)) {
    measurementContainer = document.createElement('div');
    measurementContainer.id = '__autowish_text_measurer__';
    measurementContainer.setAttribute('aria-hidden', 'true');
    Object.assign(measurementContainer.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      visibility: 'hidden',
      pointerEvents: 'none',
      zIndex: '-1000',
      boxSizing: 'border-box',
      margin: '0',
      padding: '0',
      border: 'none',
      contain: 'layout size style',
    });
    document.body.appendChild(measurementContainer);
  }

  return measurementContainer;
}

/**
 * Measures the rendered height of text with exact typography and wrapping constraints.
 */
export function measureTextHeight(options: MeasureTextOptions): number {
  if (!options.text || options.width <= 0) {
    return 0;
  }

  const container = getMeasurementContainer();
  const paddingX = options.paddingX || 0;
  const effectiveWidth = Math.max(1, options.width - paddingX * 2);
  const family = options.fontFamily ? `'${options.fontFamily}', ${UNICODE_FONT_FALLBACKS}` : UNICODE_FONT_FALLBACKS;
  const lineHeightVal = typeof options.lineHeight === 'number' ? `${options.lineHeight}` : (options.lineHeight || '1.65');

  Object.assign(container.style, {
    width: `${effectiveWidth}px`,
    maxWidth: `${effectiveWidth}px`,
    minWidth: `${effectiveWidth}px`,
    fontFamily: family,
    fontSize: `${options.fontSize}px`,
    lineHeight: lineHeightVal,
    fontWeight: String(options.fontWeight || '400'),
    letterSpacing: options.letterSpacing || 'normal',
    whiteSpace: 'pre-wrap',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
    textAlign: 'center',
  });

  container.textContent = options.text;
  const height = container.scrollHeight;

  // Clean container content to free memory
  container.textContent = '';
  return height;
}

/**
 * Binary search algorithm to find the largest readable font size where the text fits inside target dimensions.
 */
export function findOptimalFontSizeBinarySearch(options: AutoFitOptions): AutoFitResult {
  const {
    text,
    targetWidth,
    targetHeight,
    maxFontSize = DEFAULT_MAX_FONT_SIZE,
    minFontSize = DEFAULT_MIN_FONT_SIZE,
    fontFamily = 'Inter',
    lineHeight = 1.65,
    fontWeight = '400',
    letterSpacing = 'normal',
    paddingX = 0,
  } = options;

  if (!text || text.trim() === '' || targetWidth <= 0 || targetHeight <= 0) {
    return {
      fittedFontSize: maxFontSize,
      fits: true,
      overflow: false,
    };
  }

  const minSize = Math.max(8, minFontSize);
  const maxSize = Math.max(minSize, maxFontSize);

  // 1. Check if it fits at maxFontSize
  const heightAtMax = measureTextHeight({
    text,
    width: targetWidth,
    fontSize: maxSize,
    fontFamily,
    lineHeight,
    fontWeight,
    letterSpacing,
    paddingX,
  });

  if (heightAtMax <= targetHeight) {
    return {
      fittedFontSize: maxSize,
      fits: true,
      overflow: false,
    };
  }

  // 2. Binary search between minSize and maxSize
  let low = minSize;
  let high = maxSize - 1;
  let bestFit = minSize;
  let foundFittingSize = false;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const measuredHeight = measureTextHeight({
      text,
      width: targetWidth,
      fontSize: mid,
      fontFamily,
      lineHeight,
      fontWeight,
      letterSpacing,
      paddingX,
    });

    if (measuredHeight <= targetHeight) {
      bestFit = mid;
      foundFittingSize = true;
      // Try searching for larger sizes that might still fit
      low = mid + 1;
    } else {
      // Mid is too large, try smaller font sizes
      high = mid - 1;
    }
  }

  if (foundFittingSize) {
    return {
      fittedFontSize: bestFit,
      fits: true,
      overflow: false,
    };
  }

  // 3. Even at minSize, it does not fit
  return {
    fittedFontSize: minSize,
    fits: false,
    overflow: true,
  };
}
