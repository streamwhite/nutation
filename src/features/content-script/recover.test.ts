import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTENT_SCRIPT_REGISTRATION_ID } from '@/shared/constants';

const getManifest = vi.fn();
const getRegisteredContentScripts = vi.fn();
const registerContentScripts = vi.fn();
const unregisterContentScripts = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getManifest,
    },
    scripting: {
      getRegisteredContentScripts,
      registerContentScripts,
      unregisterContentScripts,
    },
  },
}));

describe('isConnectionError', () => {
  it('detects missing receiving end errors', async () => {
    const { isConnectionError } = await import('@/features/content-script/recover');
    expect(isConnectionError(new Error('Could not establish connection. Receiving end does not exist.'))).toBe(true);
    expect(isConnectionError('Receiving end does not exist')).toBe(true);
    expect(isConnectionError(new Error('No content script frames responded'))).toBe(true);
    expect(isConnectionError(new Error('API key missing'))).toBe(false);
  });
});

describe('isRestrictedUrl', () => {
  it('blocks browser internal pages', async () => {
    const { isRestrictedUrl } = await import('@/features/content-script/recover');
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('chrome://extensions/')).toBe(true);
    expect(isRestrictedUrl('https://example.com/article')).toBe(false);
  });
});

describe('getRestrictedPageMessage', () => {
  it('explains why internal pages cannot translate', async () => {
    const { getRestrictedPageMessage } = await import('@/features/content-script/recover');
    expect(getRestrictedPageMessage()).toMatch(/cannot be translated/i);
    expect(getRestrictedPageMessage()).not.toMatch(/content script unavailable/i);
  });
});

describe('registerContentScriptIfNeeded', () => {
  beforeEach(() => {
    getManifest.mockReset();
    getRegisteredContentScripts.mockReset();
    registerContentScripts.mockReset();
    unregisterContentScripts.mockReset();
    vi.resetModules();
  });

  it('skips dynamic registration when manifest already has content scripts', async () => {
    getManifest.mockReturnValue({
      content_scripts: [{ js: ['content-scripts/content.js'], matches: ['<all_urls>'] }],
    });

    const { registerContentScriptIfNeeded } = await import('@/features/content-script/recover');
    await registerContentScriptIfNeeded();

    expect(registerContentScripts).not.toHaveBeenCalled();
  });

  it('does not re-register an existing script id', async () => {
    getManifest.mockReturnValue({ content_scripts: [] });
    getRegisteredContentScripts.mockResolvedValue([{ id: CONTENT_SCRIPT_REGISTRATION_ID }]);

    const { registerContentScriptIfNeeded } = await import('@/features/content-script/recover');
    await registerContentScriptIfNeeded();

    expect(getRegisteredContentScripts).toHaveBeenCalledWith({
      ids: [CONTENT_SCRIPT_REGISTRATION_ID],
    });
    expect(registerContentScripts).not.toHaveBeenCalled();
  });

  it('treats duplicate script id as already registered', async () => {
    getManifest.mockReturnValue({ content_scripts: [] });
    getRegisteredContentScripts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: CONTENT_SCRIPT_REGISTRATION_ID }]);
    registerContentScripts.mockRejectedValue(
      new Error(`Duplicate script ID '${CONTENT_SCRIPT_REGISTRATION_ID}'`),
    );

    const { registerContentScriptIfNeeded } = await import('@/features/content-script/recover');
    await expect(registerContentScriptIfNeeded()).resolves.toBeUndefined();
  });
});
