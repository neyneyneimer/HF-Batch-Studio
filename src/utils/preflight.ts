import { PreflightResult } from '../types';

export interface PreflightOptions {
  maxSizeBytes?: number; // e.g. 15MB
  allowedMimeTypes?: string[];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  requireSquare?: boolean;
}

const DEFAULT_OPTIONS: PreflightOptions = {
  maxSizeBytes: 20 * 1024 * 1024, // 20 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
  minWidth: 64,
  maxWidth: 4096,
  minHeight: 64,
  maxHeight: 4096,
};

/**
 * Preflights a File or Data URI before submission.
 * Checks file integrity, size bounds, and dimensions.
 */
export async function preflightMedia(
  fileOrDataUrl: File | string,
  options: PreflightOptions = {}
): Promise<PreflightResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  let name = 'input_media';
  let sizeBytes = 0;
  let mimeType = 'application/octet-stream';

  if (fileOrDataUrl instanceof File) {
    name = fileOrDataUrl.name;
    sizeBytes = fileOrDataUrl.size;
    mimeType = fileOrDataUrl.type || getMimeFromExtension(name);
  } else if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    const match = fileOrDataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      mimeType = match[1];
      const base64Data = match[2];
      sizeBytes = Math.round((base64Data.length * 3) / 4);
      name = `inline_data.${mimeType.split('/')[1] || 'bin'}`;
    } else {
      errors.push('Invalid data URL format.');
      return { valid: false, errors, warnings };
    }
  } else {
    errors.push('No valid file or data URL provided for preflight.');
    return { valid: false, errors, warnings };
  }

  // 1. Mime Type Check
  if (opts.allowedMimeTypes && !opts.allowedMimeTypes.includes(mimeType)) {
    errors.push(
      `Unsupported format "${mimeType}". Expected one of: ${opts.allowedMimeTypes.map(m => m.split('/')[1]).join(', ')}`
    );
  }

  // 2. Size Check
  if (opts.maxSizeBytes && sizeBytes > opts.maxSizeBytes) {
    const mbLimit = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1);
    const actualMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    errors.push(`File size exceeds limit (${actualMb} MB > ${mbLimit} MB limit).`);
  }

  let width: number | undefined;
  let height: number | undefined;

  // 3. Image Dimensions Check (if image)
  if (mimeType.startsWith('image/')) {
    try {
      const dimensions = await inspectImageDimensions(fileOrDataUrl);
      width = dimensions.width;
      height = dimensions.height;

      if (opts.minWidth && width < opts.minWidth) {
        errors.push(`Image width (${width}px) is below minimum (${opts.minWidth}px).`);
      }
      if (opts.maxWidth && width > opts.maxWidth) {
        warnings.push(`Image width (${width}px) exceeds recommended max (${opts.maxWidth}px); server may downscale.`);
      }
      if (opts.minHeight && height < opts.minHeight) {
        errors.push(`Image height (${height}px) is below minimum (${opts.minHeight}px).`);
      }
      if (opts.maxHeight && height > opts.maxHeight) {
        warnings.push(`Image height (${height}px) exceeds recommended max (${opts.maxHeight}px); server may downscale.`);
      }

      // Check for non-standard aspect ratios
      const aspect = width / height;
      if (aspect < 0.25 || aspect > 4.0) {
        warnings.push('Extreme aspect ratio detected; output may produce visual artifacts.');
      }
    } catch (err: any) {
      errors.push(`Failed to decode image data: ${err.message || 'Corrupt or unreadable image'}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      name,
      sizeBytes,
      mimeType,
      width,
      height,
    },
  };
}

function getMimeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

function inspectImageDimensions(fileOrDataUrl: File | string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = '';

    if (fileOrDataUrl instanceof File) {
      url = URL.createObjectURL(fileOrDataUrl);
    } else {
      url = fileOrDataUrl;
    }

    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      if (fileOrDataUrl instanceof File) URL.revokeObjectURL(url);
      resolve(dimensions);
    };

    img.onerror = () => {
      if (fileOrDataUrl instanceof File) URL.revokeObjectURL(url);
      reject(new Error('Image failed to load. The file might be corrupt or an invalid image format.'));
    };

    img.src = url;
  });
}

/**
 * Converts File to base64 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as Data URL'));
    reader.readAsDataURL(file);
  });
}
