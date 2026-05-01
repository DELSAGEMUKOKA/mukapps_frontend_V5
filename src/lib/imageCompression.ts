// src/lib/imageCompression.ts
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,      // 500 KB max
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/webp'
  };
  
  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Compression: ${file.size} → ${compressedFile.size} bytes`);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    return file;
  }
}