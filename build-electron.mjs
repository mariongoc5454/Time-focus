import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

const isDev = process.argv.includes('--watch');

async function build() {
  if (!fs.existsSync('dist/electron')) {
    fs.mkdirSync('dist/electron', { recursive: true });
  }

  const commonOptions = {
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: isDev,
    external: ['electron', 'node:sqlite', 'better-sqlite3'],
    logLevel: 'info',
  };

  await esbuild.build({
    ...commonOptions,
    entryPoints: ['electron/main.ts'],
    outfile: 'dist/electron/main.js',
  });

  await esbuild.build({
    ...commonOptions,
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist/electron/preload.js',
  });

  console.log('Successfully built Electron main and preload scripts.');
}

build().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
