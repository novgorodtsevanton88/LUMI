/**
 * Стискає фото на пристрої (розділ 11 плану: до 1600 px, WebP ~250 КБ).
 * Safari старших версій не кодує WebP з canvas — тоді JPEG. EXIF (зокрема геолокація) не переноситься.
 */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  const webp = await toBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob(canvas, 'image/jpeg', quality);
  if (!jpeg) throw new Error('encode_failed');
  return jpeg;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode_failed')); };
    img.src = url;
  });
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, type, q));
