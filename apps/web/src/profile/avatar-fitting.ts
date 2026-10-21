/** Kodiert das Bild in der angegebenen Kantenlänge (px) und Qualität (0–1) als Data-URL. */
export type ImageEncoder = (size: number, quality: number) => string;

const SIZES = [128, 96, 80, 64, 48, 32];
/** Darunter sieht ein Avatar matschiger aus als eine kleinere, sauber kodierte Variante. */
const QUALITIES = [0.85, 0.7, 0.55];

/**
 * Sucht die schönste Variante, die ins Budget passt: erst Qualität senken, dann verkleinern.
 * @returns die Data-URL oder null, wenn selbst die kleinste Variante zu groß ist.
 */
export function fitAvatar(encode: ImageEncoder, budget: number): string | null {
  for (const size of SIZES) {
    for (const quality of QUALITIES) {
      const dataUrl = encode(size, quality);
      if (dataUrl.length <= budget) return dataUrl;
    }
  }
  return null;
}
