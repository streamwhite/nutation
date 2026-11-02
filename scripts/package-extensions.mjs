#!/usr/bin/env node
import { access, cp, mkdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, '.output');
const RELEASE_DIR = path.join(ROOT, 'release');
const WXT_BIN = path.join(ROOT, 'node_modules', 'wxt', 'bin', 'wxt.mjs');

const TARGETS = {
  chrome: { browser: 'chrome', label: 'Chrome Web Store' },
  edge: { browser: 'chrome', label: 'Microsoft Edge Add-ons' },
  safari: { browser: 'safari', label: 'Safari Extensions (App Store)' },
  firefox: { browser: 'firefox', label: 'Firefox Add-ons (AMO)' },
};

const TARGET_NAMES = Object.keys(TARGETS);

function printHelp() {
  console.log(`Usage: node scripts/package-extensions.mjs [targets...]

Targets:
  ${TARGET_NAMES.join(', ')}, all

Examples:
  pnpm release
  pnpm release:firefox
  node scripts/package-extensions.mjs chrome firefox
`);
}

function parseTargets(args) {
  if (args.length === 0 || args.includes('all')) {
    return TARGET_NAMES;
  }

  const unknown = args.filter((target) => !TARGETS[target]);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown target: ${unknown.join(', ')}. Available: ${TARGET_NAMES.join(', ')}, all`,
    );
  }

  return [...new Set(args)];
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

async function readPackage() {
  const content = await readFile(path.join(ROOT, 'package.json'), 'utf8');
  const pkg = JSON.parse(content);
  return {
    name: pkg.name,
    version: pkg.version,
  };
}

async function packageBrowser(browser) {
  console.log(`\n▸ Building and zipping ${browser}…`);
  run(process.execPath, [WXT_BIN, 'zip', '-b', browser]);

  const { name, version } = await readPackage();
  const zipPath = path.join(OUTPUT_DIR, `${name}-${version}-${browser}.zip`);
  await access(zipPath);
  return zipPath;
}

async function copyArtifact(source, destination, label) {
  await cp(source, destination, { force: true });
  const { size } = await stat(destination);
  const sizeMb = (size / 1024 / 1024).toFixed(2);
  console.log(`✓ ${label}: ${path.relative(ROOT, destination)} (${sizeMb} MB)`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const targets = parseTargets(args);
  const { name, version } = await readPackage();
  await mkdir(RELEASE_DIR, { recursive: true });

  const built = new Map();
  const ensureZip = async (browser) => {
    if (!built.has(browser)) {
      built.set(browser, await packageBrowser(browser));
    }
    return built.get(browser);
  };

  for (const target of targets) {
    const { browser, label } = TARGETS[target];
    const source = await ensureZip(browser);
    const destination = path.join(RELEASE_DIR, `${name}-${version}-${target}.zip`);
    await copyArtifact(source, destination, label);

    const stableDestination = path.join(RELEASE_DIR, `${name}-${target}.zip`);
    await copyArtifact(source, stableDestination, `${label} (latest alias)`);
  }

  if (targets.includes('firefox')) {
    const sources = path.join(OUTPUT_DIR, `${name}-${version}-sources.zip`);
    try {
      await access(sources);
      const destination = path.join(RELEASE_DIR, `${name}-${version}-firefox-sources.zip`);
      await copyArtifact(sources, destination, 'Firefox source code (AMO)');

      const stableDestination = path.join(RELEASE_DIR, `${name}-firefox-sources.zip`);
      await copyArtifact(sources, stableDestination, 'Firefox source code (latest alias)');
    } catch {
      console.warn('! Firefox sources zip not found; AMO may ask for source code separately.');
    }
  }

  console.log(`\nDone. Upload files from ${path.relative(ROOT, RELEASE_DIR)}/`);
}

main().catch((error) => {
  console.error(`\nRelease failed: ${error.message}`);
  process.exit(1);
});
