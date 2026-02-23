#!/usr/bin/env node
/**
 * Check that public/manuals/*.md matches docs/manuals/*.md
 * Fails if any file differs or is missing.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sourceDir = join(rootDir, 'docs', 'manuals');
const targetDir = join(rootDir, 'public', 'manuals');

const sourceFiles = readdirSync(sourceDir).filter(f => f.endsWith('.md')).sort();
const targetFiles = existsSync(targetDir) 
  ? readdirSync(targetDir).filter(f => f.endsWith('.md')).sort()
  : [];

let hasError = false;

console.log('Checking manual sync status...');

// Check for missing files in public/
for (const file of sourceFiles) {
  if (!targetFiles.includes(file)) {
    console.error(`  ✗ Missing in public/manuals: ${file}`);
    hasError = true;
  }
}

// Check for extra files in public/
for (const file of targetFiles) {
  if (!sourceFiles.includes(file)) {
    console.error(`  ✗ Extra file in public/manuals: ${file}`);
    hasError = true;
  }
}

// Check content matches
for (const file of sourceFiles) {
  if (!targetFiles.includes(file)) continue;
  
  const srcContent = readFileSync(join(sourceDir, file), 'utf-8');
  const destContent = readFileSync(join(targetDir, file), 'utf-8');
  
  if (srcContent !== destContent) {
    console.error(`  ✗ Content differs: ${file}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\n✗ Manual sync check FAILED.');
  console.error('Run "npm run manuals:sync" to sync docs/manuals to public/manuals.');
  process.exit(1);
}

console.log(`✓ All ${sourceFiles.length} manual(s) are in sync.`);
