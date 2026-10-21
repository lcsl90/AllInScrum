import { fitAvatar, type ImageEncoder } from './avatar-fitting.ts';
import { MAX_AVATAR_DATA_URL_LENGTH } from './profile-cookie.ts';

/**
 * Macht aus einer hochgeladenen Bilddatei einen quadratischen, kleinen Avatar, der in ein Cookie passt.
 * @returns die Data-URL oder null, wenn sich das Bild nicht klein genug kodieren lässt.
 */
export async function avatarFromFile(file: Blob): Promise<string | null> {
  const image = await createImageBitmap(file);
  try {
    return fitAvatar(canvasEncoder(image), MAX_AVATAR_DATA_URL_LENGTH);
  } finally {
    image.close();
  }
}

/** Zeichnet den mittigen, quadratischen Ausschnitt des Bildes in der gewünschten Größe. */
function canvasEncoder(image: ImageBitmap): ImageEncoder {
  const side = Math.min(image.width, image.height);
  const sourceX = (image.width - side) / 2;
  const sourceY = (image.height - side) / 2;
  const type = preferredImageType();

  return (size, quality) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas wird nicht unterstützt');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);
    return canvas.toDataURL(type, quality);
  };
}

/** WebP ist deutlich kleiner; ältere Browser kodieren es nicht und fallen sonst auf PNG zurück. */
function preferredImageType(): 'image/webp' | 'image/jpeg' {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  return probe.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}
