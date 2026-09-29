import { describe, expect, it, vi, beforeEach } from 'vitest';

const loadSettings = vi.fn();
const hasApiKey = vi.fn();
const isRestrictedUrl = vi.fn();

vi.mock('@/shared/settings', () => ({ loadSettings }));
vi.mock('@/shared/api-key', () => ({ hasApiKey }));
vi.mock('@/features/content-script/recover', () => ({ isRestrictedUrl }));

describe('maybeAutoTranslateOnOpen', () => {
  beforeEach(() => {
    loadSettings.mockReset();
    hasApiKey.mockReset();
    isRestrictedUrl.mockReset();
    isRestrictedUrl.mockReturnValue(false);
    hasApiKey.mockReturnValue(true);
  });

  it('starts translation when autostart and a rule match', async () => {
    loadSettings.mockResolvedValue({
      targetLang: 'zh-CN',
      translateOnOpen: true,
      translateOnOpenRules: [{
        id: '1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
      }],
      apiKey: 'key',
    });
    const start = vi.fn().mockResolvedValue({ active: true });
    const translator = {
      getStatus: () => ({ active: false }),
      start,
    };

    const { maybeAutoTranslateOnOpen } = await import('@/features/translate-on-open/auto-start');
    await maybeAutoTranslateOnOpen(translator as never, () => 'https://docs.example.com/a');

    expect(start).toHaveBeenCalledWith('zh-CN', expect.objectContaining({
      translateOnOpen: true,
    }));
  });

  it('skips when autostart checkbox is off', async () => {
    loadSettings.mockResolvedValue({
      targetLang: 'zh-CN',
      translateOnOpen: false,
      translateOnOpenRules: [{
        id: '1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
      }],
      apiKey: 'key',
    });
    const start = vi.fn();
    const translator = {
      getStatus: () => ({ active: false }),
      start,
    };

    const { maybeAutoTranslateOnOpen } = await import('@/features/translate-on-open/auto-start');
    await maybeAutoTranslateOnOpen(translator as never, () => 'https://example.com/');

    expect(start).not.toHaveBeenCalled();
  });
});
