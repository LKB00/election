'use client';
import { MAX_PHOTO_CHARS } from './limits';

// A photo from the phone, made ready for a choice: turned the right way up, cut to the 4:5 shape of the ballot card
// (centre, a little above the middle where faces usually are), made small (480×600) and saved as a JPEG. Re-drawing
// it also drops the hidden details phones add (like the place it was taken).
export async function photoForChoice(file: File): Promise<string> {
  const W = 480;
  const H = 600;
  let img: CanvasImageSource & { width: number; height: number };
  try {
    img = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(file);
    });
  }
  const scale = Math.max(W / img.width, H / img.height);
  const sw = W / scale;
  const sh = H / scale;
  const sx = (img.width - sw) / 2;
  const sy = Math.max(0, Math.min(img.height - sh, (img.height - sh) * 0.35));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  for (const q of [0.82, 0.72, 0.6, 0.5]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (url.length <= MAX_PHOTO_CHARS) return url;
  }
  throw new Error('too big');
}
