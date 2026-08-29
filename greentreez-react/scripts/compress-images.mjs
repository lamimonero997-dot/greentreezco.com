import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const MAX_SIZE_MB = 1;
const QUALITY = 80;
const TARGET_DIR = 'public';

async function getAllFiles(dir, fileList = []) {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      await getAllFiles(filePath, fileList);
    } else if (extname(file).toLowerCase() === '.png') {
      fileList.push(filePath);
    }
  }

  return fileList;
}

async function compressImage(filePath) {
  const stats = await stat(filePath);
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB > MAX_SIZE_MB) {
    console.log(`Compressing ${filePath} (${sizeMB.toFixed(2)} MB)`);

    const tempPath = filePath + '.tmp';

    await sharp(filePath)
      .png({ quality: QUALITY, compressionLevel: 9 })
      .toFile(tempPath);

    const newStats = await stat(tempPath);
    const newSizeMB = newStats.size / (1024 * 1024);
    const savings = ((sizeMB - newSizeMB) / sizeMB * 100).toFixed(1);

    // Replace original with compressed version
    await sharp(tempPath).toFile(filePath);

    // Clean up temp file
    await import('fs/promises').then(fs => fs.unlink(tempPath));

    console.log(`  ✓ Reduced to ${newSizeMB.toFixed(2)} MB (${savings}% savings)`);
  }
}

async function main() {
  console.log('Finding PNG files...');
  const files = await getAllFiles(TARGET_DIR);
  console.log(`Found ${files.length} PNG files\n`);

  let compressed = 0;
  for (const file of files) {
    try {
      await compressImage(file);
      compressed++;
    } catch (error) {
      console.error(`Error compressing ${file}:`, error.message);
    }
  }

  console.log(`\nCompression complete! Processed ${compressed} files.`);
}

main().catch(console.error);
