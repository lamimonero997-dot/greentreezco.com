import { readFile, writeFile } from 'fs/promises';

const file = 'public/data/catalog.json';

async function compressJSON() {
  const data = await readFile(file, 'utf-8');
  // Remove BOM if present
  const cleanData = data.replace(/^﻿/, '');
  const parsed = JSON.parse(cleanData);

  // Write minified version
  const minified = JSON.stringify(parsed);
  await writeFile(file, minified);

  console.log(`Compressed ${file}`);
  console.log(`Before: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`After: ${(minified.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Savings: ${(((data.length - minified.length) / data.length) * 100).toFixed(1)}%`);
}

compressJSON().catch(console.error);
