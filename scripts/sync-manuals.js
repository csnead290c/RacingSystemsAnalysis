#!/usr/bin/env node
/**
 * Sync manuals from docs/manuals/*.md to public/manuals/*.md
 * This ensures the public runtime files match the source of truth.
 */

import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sourceDir = join(rootDir, 'docs', 'manuals');
const targetDir = join(rootDir, 'public', 'manuals');

// Ensure target directory exists
mkdirSync(targetDir, { recursive: true });

// Copy all .md files
const files = readdirSync(sourceDir).filter(f => f.endsWith('.md'));

console.log(`Syncing ${files.length} manual(s) from docs/manuals to public/manuals...`);

for (const file of files) {
  const src = join(sourceDir, file);
  const dest = join(targetDir, file);
  copyFileSync(src, dest);
  console.log(`  ✓ ${file}`);
}

console.log('✓ Manuals synced successfully.');
