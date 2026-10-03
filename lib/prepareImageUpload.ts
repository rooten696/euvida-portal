export async function prepareImageUpload(file: File, maxBytes = 3500 * 1024): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Soubor neni obrazek.');
  if (file.size > 40 * 1024 * 1024) throw new Error('Zdrojovy obrazek je vetsi nez 40 MB.');
  if (file.size <= maxBytes) return file;
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40000000) throw new Error('Obrazek ma prilis velke rozliseni.');
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Prohlizec nepodporuje kompresi obrazku.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= maxBytes) {
        const extension = blob.type === 'image/webp' ? 'webp' : 'png';
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, { type: blob.type });
      }
    }
    throw new Error('Obrazek se nepodarilo zmensit pod limit. Pouzijte mensi soubor.');
  } finally {
    image.close();
  }
}
