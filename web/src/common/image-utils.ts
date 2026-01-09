const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const extFromMime = (mime: string): string => {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
};

const pickOutputMime = (inputMime: string): string => {
  if (inputMime === 'image/png' || inputMime === 'image/jpeg' || inputMime === 'image/webp') return inputMime;
  return 'image/jpeg';
};

const resizeAndStripExifToBase64 = async (
  file: File,
  maxSize = 1000,
  jpegQuality = 0.9,
): Promise<{ base64: string; mime: string; ext: string; width: number; height: number }> => {
  let bitmap: ImageBitmap | null = null;

  const canUseCreateImageBitmap = typeof createImageBitmap === 'function';
  if (canUseCreateImageBitmap) {
    try {
      // @ts-ignore
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }
  }

  let srcW: number;
  let srcH: number;
  let drawSource: CanvasImageSource;

  if (bitmap) {
    srcW = bitmap.width;
    srcH = bitmap.height;
    drawSource = bitmap;
  } else {
    // Fallback: HTMLImageElement
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Failed to decode image'));
      i.src = dataUrl;
    });

    srcW = img.naturalWidth;
    srcH = img.naturalHeight;
    drawSource = img;
  }

  // Compute target size within maxSize x maxSize
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  // Draw into canvas / strip exif
  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(drawSource, 0, 0, dstW, dstH);

  // Choose output encoding
  const outMime = pickOutputMime(file.type || '');
  const outExt = extFromMime(outMime);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      outMime,
      outMime === 'image/jpeg' ? jpegQuality : undefined,
    );
  });

  // Cleanup
  if (bitmap) bitmap.close();

  const base64 = arrayBufferToBase64(await blob.arrayBuffer());
  return { base64, mime: outMime, ext: outExt, width: dstW, height: dstH };
};

export { arrayBufferToBase64, extFromMime, pickOutputMime, resizeAndStripExifToBase64 };
