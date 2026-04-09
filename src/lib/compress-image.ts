const MAX_BYTES = 15 * 1024 * 1024; // 15 MB hard limit
const TARGET_QUALITY = 0.82;
const MIN_QUALITY = 0.5;
const MAX_DIMENSION = 2560;

/**
 * Compress an image File to stay under 15 MB.
 * Progressively lowers quality until it fits or hits MIN_QUALITY.
 * Non-image files are returned as-is.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Scale down if too large
  const scale = Math.min(1, MAX_DIMENSION / Math.max(origW, origH));
  const w = Math.round(origW * scale);
  const h = Math.round(origH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = TARGET_QUALITY;
  let blob: Blob | null = null;

  // Try progressively lower quality until under limit
  while (quality >= MIN_QUALITY) {
    blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob || blob.size <= MAX_BYTES) break;
    quality -= 0.08;
  }

  if (!blob) return file; // fallback: return original

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
