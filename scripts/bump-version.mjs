#!/usr/bin/env node

/**
 * Bumps the version across all files in the project.
 * Usage: node scripts/bump-version.mjs <new-version>
 *
 * Updates:
 *  - package.json & package-lock.json (root)
 *  - vscode-extension/package.json & package-lock.json
 *  - server.json (top-level version + package version)
 *  - src/index.ts (McpServer version)
 *  - vscode-extension/src/extension.ts (fallback version)
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+/.test(newVersion)) {
  console.error('Usage: node scripts/bump-version.mjs <version>');
  console.error('Example: node scripts/bump-version.mjs 1.0.8');
  process.exit(1);
}

function replaceInFile(filePath, search, replacement) {
  const abs = resolve(root, filePath);
  const content = readFileSync(abs, 'utf-8');
  const updated = content.replace(search, replacement);
  if (content === updated) {
    console.warn(`  ⚠ No change in ${filePath}`);
  } else {
    writeFileSync(abs, updated, 'utf-8');
    console.log(`  ✓ ${filePath}`);
  }
}

// Read current version from root package.json
const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const oldVersion = rootPkg.version;

if (oldVersion === newVersion) {
  console.log(`Already at version ${newVersion}`);
  process.exit(0);
}

console.log(`Bumping ${oldVersion} → ${newVersion}\n`);

// 1. Root package.json + package-lock.json via npm
console.log('npm (root):');
execSync(`npm version ${newVersion} --no-git-tag-version`, { cwd: root, stdio: 'pipe' });
console.log('  ✓ package.json & package-lock.json');

// 2. vscode-extension package.json + package-lock.json via npm
console.log('npm (vscode-extension):');
const extDir = resolve(root, 'vscode-extension');
execSync(`npm version ${newVersion} --no-git-tag-version`, { cwd: extDir, stdio: 'pipe' });
console.log('  ✓ package.json & package-lock.json');

// 3. server.json
console.log('server.json:');
const escaped = oldVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const versionRegex = new RegExp(`"version":\\s*"${escaped}"`, 'g');
replaceInFile('server.json', versionRegex, `"version": "${newVersion}"`);

// 4. src/index.ts — McpServer version
console.log('src/index.ts:');
replaceInFile(
  'src/index.ts',
  `version: "${oldVersion}"`,
  `version: "${newVersion}"`
);

// 5. vscode-extension/src/extension.ts — fallback version
console.log('vscode-extension/src/extension.ts:');
replaceInFile(
  'vscode-extension/src/extension.ts',
  `?? '${oldVersion}'`,
  `?? '${newVersion}'`
);

console.log(`\nDone! Version is now ${newVersion}`);
