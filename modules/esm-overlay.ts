import { resolve } from 'node:path';
import { build, mergeConfig, type InlineConfig, type LibraryFormats } from 'vite';
import { defineWxtModule } from 'wxt/modules';
import type { Wxt } from 'wxt';

const CONTENT_ENTRYPOINT_NAME = 'content';
const IIFE_PLUGIN_PREFIX = 'wxt:iife';
const OVERLAY_ENTRY = 'features/summarize/overlay-entry.ts';
const OVERLAY_OUTPUT_DIR = 'content-scripts/esm';
const OVERLAY_OUTPUT_FILE = 'overlay.js';
const OVERLAY_LIB_NAME = 'pageTranslateOverlay';

/**
 * WXT bundles content scripts as a single IIFE, so a dynamic `import()` inside
 * the content script is inlined and React/Tailwind would load on every page.
 * This module prebuilds the overlay as a separate ESM bundle and exposes it as
 * a web-accessible resource, so `page-summarize` can load it on demand.
 *
 * The overlay entry is bundled in addition to the normal WXT build output.
 */
export default defineWxtModule((wxt) => {
  let baseConfig: InlineConfig | undefined;
  let watcherBound = false;
  let buildQueue: Promise<unknown> = Promise.resolve();

  wxt.hooks.hook('vite:build:extendConfig', ([entrypoint], config) => {
    if (entrypoint?.name === CONTENT_ENTRYPOINT_NAME) {
      baseConfig = config;
    }
  });

  const buildOverlayBundle = async () => {
    if (!baseConfig) {
      wxt.logger.warn(`[esm-overlay] Missing "${CONTENT_ENTRYPOINT_NAME}" config, skipping.`);
      return;
    }
    wxt.logger.info('[esm-overlay] Building lazy overlay bundle...');
    await build(getOverlayConfig(wxt, baseConfig));
    wxt.logger.success(`[esm-overlay] Overlay bundle ${OVERLAY_OUTPUT_DIR}/${OVERLAY_OUTPUT_FILE}`);
  };

  // Serialize rebuilds triggered by the dev watcher and keep failures non-fatal.
  const scheduleOverlayBuild = () => {
    buildQueue = buildQueue.then(buildOverlayBundle).catch((error: unknown) => {
      wxt.logger.error(`[esm-overlay] ${error instanceof Error ? error.message : String(error)}`);
    });
  };

  const bindWatcher = () => {
    const watchedDir = resolve(wxt.config.srcDir);
    const ignored = new Set([resolve(watchedDir, 'entrypoints', 'content.ts')]);
    wxt.server?.watcher.on('all', (_event, file) => {
      if (file.startsWith(watchedDir) && !ignored.has(file)) {
        scheduleOverlayBuild();
      }
    });
  };

  wxt.hooks.hook('build:done', async () => {
    await buildOverlayBundle();
    if (!watcherBound) {
      watcherBound = true;
      bindWatcher();
    }
  });

  wxt.hooks.hook('build:manifestGenerated', (_wxt, manifest) => {
    manifest.web_accessible_resources ??= [];
    manifest.web_accessible_resources.push({
      matches: ['<all_urls>'],
      resources: [`/${OVERLAY_OUTPUT_DIR}/*`],
    });
  });

  wxt.hooks.hook('prepare:publicPaths', (_wxt, paths) => {
    paths.push(`${OVERLAY_OUTPUT_DIR}/${OVERLAY_OUTPUT_FILE}`);
  });
});

function getOverlayLib(wxt: Wxt) {
  return {
    entry: resolve(wxt.config.srcDir, OVERLAY_ENTRY),
    formats: ['es'] as LibraryFormats[],
    name: OVERLAY_LIB_NAME,
    fileName: () => OVERLAY_OUTPUT_FILE,
  };
}

function getOverlayOutput() {
  return {
    entryFileNames: OVERLAY_OUTPUT_FILE,
    chunkFileNames: 'chunks/[name]-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]',
  };
}

function withoutIifePlugins(config: InlineConfig): InlineConfig {
  return {
    ...config,
    plugins: (config.plugins ?? []).filter((plugin) => !isIifePlugin(plugin)),
  };
}

function isIifePlugin(plugin: unknown): boolean {
  if (!plugin || typeof plugin !== 'object' || !('name' in plugin)) {
    return false;
  }
  const name = (plugin as { name?: unknown }).name;
  return typeof name === 'string' && name.startsWith(IIFE_PLUGIN_PREFIX);
}

function getOverlayConfig(wxt: Wxt, baseConfig: InlineConfig): InlineConfig {
  const merged = mergeConfig(withoutIifePlugins(baseConfig), {
    build: {
      lib: getOverlayLib(wxt),
      outDir: resolve(wxt.config.outDir, OVERLAY_OUTPUT_DIR),
      emptyOutDir: false,
      rollupOptions: { output: getOverlayOutput() },
    },
  });

  // `mergeConfig` concatenates arrays, so pin the lib and output explicitly.
  merged.build ??= {};
  merged.build.lib = getOverlayLib(wxt);
  merged.build.outDir = resolve(wxt.config.outDir, OVERLAY_OUTPUT_DIR);
  merged.build.emptyOutDir = false;
  merged.build.rollupOptions = { output: getOverlayOutput() };
  return merged;
}
