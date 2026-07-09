import { browser } from 'wxt/browser';
import { CONTENT_SCRIPT_FILE } from '@/shared/constants';

export function getContentScriptFiles(): string[] {
  const manifest = browser.runtime.getManifest();
  const manifestFiles = (manifest.content_scripts ?? []).flatMap((entry) => entry.js ?? []);
  if (manifestFiles.length > 0) {
    return manifestFiles;
  }
  return [CONTENT_SCRIPT_FILE];
}
