import { readFileSync, writeFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const path = join(__dirname, '../public/pages/index.json');

let raw = readFileSync(path, 'utf8');

// Remove BOM if present
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
  console.log('Removed BOM character');
}

// The file has an unescaped quote inside a JSON string value.
// Specifically: data-src=\"" type=  (the closing " of the empty src attr broke the JSON string)
// It should be:  data-src=\"\" type=
const bad  = 'data-src=\\"" type=';
const good = 'data-src=\\"\\" type=';

const count = (raw.split(bad).length - 1);
console.log(`Occurrences of bad pattern: ${count}`);

if (count === 0) {
  console.log('Pattern not found — checking what is actually at position 121957...');
  console.log(JSON.stringify(raw.slice(121920, 122020)));
  process.exit(1);
}

const fixed = raw.split(bad).join(good);

// Verify it's now valid JSON before writing
try {
  JSON.parse(fixed);
  console.log('JSON is valid after fix ✓');
} catch (e) {
  console.error('Still invalid JSON after fix:', e.message);
  // Find next error position
  const pos = parseInt(e.message.match(/position (\d+)/)?.[1] ?? '0');
  console.log('Context around error:', JSON.stringify(fixed.slice(Math.max(0, pos - 40), pos + 40)));
  process.exit(1);
}

writeFileSync(path, fixed, 'utf8');
console.log('Written successfully.');
