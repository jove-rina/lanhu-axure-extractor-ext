/**
 * Pack browser extension to .zip from Vite build output.
 * Cross-platform: Windows (PowerShell), macOS / Linux (`zip` CLI).
 *
 * Usage: pnpm run pack          (build + pack)
 *        pnpm run build && node scripts/pack.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('dist/manifest.json not found. Run `pnpm run build` first.');
  process.exit(1);
}

/** @type {{ version?: string }} */
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;
if (!version) {
  console.error('Cannot read version from dist/manifest.json');
  process.exit(1);
}

const zipName = `lanhu-axure-extractor-ext-v${version}.zip`;
const zipPath = path.join(distDir, zipName);
const stagingDir = path.join(distDir, '_pack_staging');

fs.rmSync(stagingDir, { recursive: true, force: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
fs.mkdirSync(stagingDir, { recursive: true });

for (const name of fs.readdirSync(distDir)) {
  if (name === zipName || name === '_pack_staging') continue;
  fs.cpSync(path.join(distDir, name), path.join(stagingDir, name), { recursive: true });
}

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function zipWithPowerShell() {
  const staging = stagingDir.replace(/'/g, "''");
  const dest = zipPath.replace(/'/g, "''");
  const cmd = `$ErrorActionPreference='Stop'; Compress-Archive -Path (Join-Path '${staging}' '*') -DestinationPath '${dest}' -Force`;
  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd],
    { stdio: 'inherit' },
  );
  if (result.error) fail(`Failed to run PowerShell: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function zipWithCli() {
  const result = spawnSync('zip', ['-qr', zipPath, '.'], {
    cwd: stagingDir,
    stdio: 'inherit',
  });
  if (result.error?.code === 'ENOENT') {
    fail('`zip` command not found. Install it (e.g. `brew install zip` or `apt install zip`).');
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.platform === 'win32') {
  zipWithPowerShell();
} else {
  zipWithCli();
}

fs.rmSync(stagingDir, { recursive: true, force: true });

/** @param {string} dir */
function countFiles(dir) {
  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countFiles(full);
    else if (path.extname(ent.name) !== '.zip') count += 1;
  }
  return count;
}

console.log(`Done: ${zipPath}`);
console.log(`Files: ${countFiles(distDir)}`);
