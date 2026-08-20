/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number; // target max size in bytes (e.g. 300 * 1024)
}

/**
 * Resizes and compresses an image (File or Base64 string) using HTML5 Canvas.
 * Ensures the output image is crisp while remaining well under Firestore's 1MB limit.
 */
export async function compressImage(
  input: File | string,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.8,
    maxSizeBytes = 300 * 1024, // 300 KB max limit
  } = options;

  let dataUrl: string;

  if (typeof input === 'string') {
    dataUrl = input;
  } else {
    dataUrl = await readFileAsDataUrl(input);
  }

  // If it's a remote URL (http/https) and not a base64 string, return as is
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  // Load the image into an HTMLImageElement
  const img = await loadImage(dataUrl);

  // Determine is PNG (might have transparency)
  const isPng = dataUrl.startsWith('data:image/png');

  // Compute scaled dimensions while maintaining aspect ratio
  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Use smooth image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Determine export format
  // If PNG, try PNG first; if resulting size is too large (> maxSizeBytes), convert to JPEG
  let outputMime = isPng ? 'image/png' : 'image/jpeg';
  let compressedResult = canvas.toDataURL(outputMime, quality);

  // Check base64 byte size (approx length * 0.75)
  let approxBytes = Math.round((compressedResult.length * 3) / 4);

  if (approxBytes > maxSizeBytes && isPng) {
    // If PNG is still too large, convert to JPEG with white background
    const jpegCanvas = document.createElement('canvas');
    jpegCanvas.width = targetWidth;
    jpegCanvas.height = targetHeight;
    const jctx = jpegCanvas.getContext('2d');
    if (jctx) {
      jctx.fillStyle = '#ffffff';
      jctx.fillRect(0, 0, targetWidth, targetHeight);
      jctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      compressedResult = jpegCanvas.toDataURL('image/jpeg', quality);
      approxBytes = Math.round((compressedResult.length * 3) / 4);
    }
  }

  // If still too large, step down quality
  let currentQuality = quality;
  while (approxBytes > maxSizeBytes && currentQuality > 0.4) {
    currentQuality -= 0.15;
    compressedResult = canvas.toDataURL('image/jpeg', currentQuality);
    approxBytes = Math.round((compressedResult.length * 3) / 4);
  }

  return compressedResult;
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
