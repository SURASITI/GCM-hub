/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
  minDimension?: number;
}

export const THUMBNAIL_COMPRESS_OPTIONS: Required<CompressOptions> = {
  maxWidth: 360,
  maxHeight: 360,
  quality: 0.72,
  maxSizeBytes: 35 * 1024, // 35 KB max
  minDimension: 140,
};

export const AVATAR_COMPRESS_OPTIONS: Required<CompressOptions> = {
  maxWidth: 96,
  maxHeight: 96,
  quality: 0.72,
  maxSizeBytes: 10 * 1024, // 10 KB max
  minDimension: 48,
};

/**
 * Estimates exact binary byte size of a Base64 Data URL.
 */
export function getDataUrlByteSize(dataUrl: string): number {
  if (!dataUrl || !dataUrl.startsWith('data:')) return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Checks whether a Data URL image exceeds the target byte cap or is not yet WebP.
 */
export function needsImageOptimization(url: string | undefined, maxSizeBytes: number): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) {
    const isWebp = url.startsWith('data:image/webp');
    const bytes = getDataUrlByteSize(url);
    return !isWebp || bytes > maxSizeBytes;
  }
  if (url.includes('images.unsplash.com') && !url.includes('w=400')) {
    return true;
  }
  return false;
}

/**
 * Optimizes Unsplash URL parameters to lightweight WebP dimensions.
 */
export function optimizeRemoteImageUrl(url: string): string {
  if (!url || !url.includes('images.unsplash.com')) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('w', '400');
    parsed.searchParams.set('q', '55');
    parsed.searchParams.set('fm', 'webp');
    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('fit', 'crop');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Resizes and compresses an image (File or Base64 Data URL) into Ultra-Compact WebP.
 * Falls back to JPEG only if the browser does not support WebP canvas encoding.
 */
export async function compressImage(
  input: File | string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = THUMBNAIL_COMPRESS_OPTIONS.maxWidth,
    maxHeight = THUMBNAIL_COMPRESS_OPTIONS.maxHeight,
    quality = THUMBNAIL_COMPRESS_OPTIONS.quality,
    maxSizeBytes = THUMBNAIL_COMPRESS_OPTIONS.maxSizeBytes,
    minDimension = THUMBNAIL_COMPRESS_OPTIONS.minDimension,
  } = options;

  let dataUrl: string;

  if (typeof input === 'string') {
    dataUrl = input;
  } else {
    dataUrl = await readFileAsDataUrl(input);
  }

  // If it's a remote URL (http/https) and not a base64 string, optimize known CDN params and return
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return optimizeRemoteImageUrl(dataUrl);
  }

  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // Skip re-encoding if already a compact WebP within budget
  if (typeof input === 'string' && dataUrl.startsWith('data:image/webp') && getDataUrlByteSize(dataUrl) <= maxSizeBytes) {
    return dataUrl;
  }

  const img = await loadImage(dataUrl);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const encodeCanvas = (w: number, h: number, q: number, mime: 'image/webp' | 'image/jpeg'): string => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(mime, q);
  };

  // Detect WebP support in browser Canvas
  let bestResult = encodeCanvas(targetWidth, targetHeight, quality, 'image/webp');
  const supportsWebp = bestResult.startsWith('data:image/webp');
  const activeMime: 'image/webp' | 'image/jpeg' = supportsWebp ? 'image/webp' : 'image/jpeg';

  if (!supportsWebp) {
    bestResult = encodeCanvas(targetWidth, targetHeight, quality, 'image/jpeg');
  }

  let currentBytes = getDataUrlByteSize(bestResult);

  // Step 1: Lower quality progressively until within maxSizeBytes
  const qualitySteps = [0.6, 0.48, 0.36];
  for (const q of qualitySteps) {
    if (currentBytes <= maxSizeBytes) break;
    if (q >= quality) continue;
    const candidate = encodeCanvas(targetWidth, targetHeight, q, activeMime);
    const candidateBytes = getDataUrlByteSize(candidate);
    if (candidateBytes < currentBytes) {
      bestResult = candidate;
      currentBytes = candidateBytes;
    }
  }

  // Step 2: If still over byte budget, gently step down pixel dimensions
  let curW = targetWidth;
  let curH = targetHeight;
  while (currentBytes > maxSizeBytes && Math.max(curW, curH) > minDimension) {
    curW = Math.max(minDimension, Math.round(curW * 0.82));
    curH = Math.max(minDimension, Math.round(curH * 0.82));
    const candidate = encodeCanvas(curW, curH, 0.48, activeMime);
    const candidateBytes = getDataUrlByteSize(candidate);
    if (candidateBytes < currentBytes) {
      bestResult = candidate;
      currentBytes = candidateBytes;
    } else {
      break;
    }
  }

  return bestResult;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
