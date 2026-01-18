import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_DIMENSION = 1024;
const DEBUG_SAVE_UPLOADS = process.env.DEBUG_SAVE_UPLOADS === 'true';

/**
 * Processes and optimizes an image buffer
 * - Resizes to max dimension of 1024px (preserving aspect ratio)
 * - Converts to PNG format
 * - Returns optimized buffer
 */
export async function processImage(
  inputBuffer: Buffer,
  debugId?: string
): Promise<Buffer> {
  try {
    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('画像のメタデータを読み取れませんでした');
    }

    // Calculate resize dimensions
    let width = metadata.width;
    let height = metadata.height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    // Process image
    const processedBuffer = await sharp(inputBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({
        quality: 90,
        compressionLevel: 9,
      })
      .toBuffer();

    // Debug: Save to disk if enabled
    if (DEBUG_SAVE_UPLOADS && debugId) {
      await saveDebugImage(processedBuffer, debugId);
    }

    return processedBuffer;
  } catch (error: any) {
    console.error('Image processing error:', error);
    throw new Error(`画像処理エラー: ${error.message || '不明なエラー'}`);
  }
}

/**
 * Saves image to disk for debugging purposes
 */
async function saveDebugImage(buffer: Buffer, debugId: string): Promise<void> {
  try {
    const debugDir = join(process.cwd(), 'tmp', 'uploads');
    await mkdir(debugDir, { recursive: true });

    const filename = `${debugId}_${Date.now()}.png`;
    const filepath = join(debugDir, filename);

    await writeFile(filepath, buffer);
    console.log(`[DEBUG] Saved upload to: ${filepath}`);
  } catch (error) {
    // Don't throw on debug save failure
    console.error('[DEBUG] Failed to save debug image:', error);
  }
}

/**
 * Converts a base64 string to a buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Converts a buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Gets image dimensions without loading the full image
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('画像のサイズを取得できませんでした');
  }

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * Validates that the buffer is a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height);
  } catch {
    return false;
  }
}
