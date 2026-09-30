import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatPageInfo,
  isTrackingQueryParam,
  readPageDescription,
  readPageInfo,
  readPageLink,
  readPageTitle,
  stripTrackingParams,
} from '@/features/copy-page/page-info';
import type { ExtensionSettings } from '@/shared/settings';

const settings: ExtensionSettings = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'test-key',
  model: 'gemini-2.5-flash-lite',
  targetLang: 'zh-CN',
  autoRecoverContentScript: true,
  translationMode: 'bulk',
  translateOnOpen: true,
  translateOnOpenRules: [],
  summaryPosition: 'right',
  cacheMaxEntries: 1_000_000,
  copyIncludeLink: true,
  uiLocale: 'auto',
};

const mockTranslate = vi.fn();

vi.mock('@/features/translate/in-page-translate', () => ({
  InPageTranslator: class {
    translate = mockTranslate;
  },
}));

beforeEach(() => {
  mockTranslate.mockReset();
  document.title = '';
  document.head.innerHTML = '';
});

describe('isTrackingQueryParam', () => {
  it('matches utm_ prefixes and known click ids', () => {
    expect(isTrackingQueryParam('utm_source')).toBe(true);
    expect(isTrackingQueryParam('UTM_Campaign')).toBe(true);
    expect(isTrackingQueryParam('fbclid')).toBe(true);
    expect(isTrackingQueryParam('id')).toBe(false);
  });
});

describe('stripTrackingParams', () => {
  it('removes tracking params and keeps the rest', () => {
    expect(
      stripTrackingParams('https://ex.com/a?utm_source=x&utm_medium=y&id=7&fbclid=z'),
    ).toBe('https://ex.com/a?id=7');
  });

  it('returns non-url input unchanged', () => {
    expect(stripTrackingParams('not a url')).toBe('not a url');
  });
});

describe('readPageInfo', () => {
  it('reads title, description and canonical link', () => {
    document.head.innerHTML = `
      <meta name="description" content="A page description" />
      <link rel="canonical" href="https://ex.com/post?utm_source=news&id=7" />
    `;
    document.title = 'Page title';

    expect(readPageTitle(document)).toBe('Page title');
    expect(readPageDescription(document)).toBe('A page description');
    expect(readPageLink(document)).toBe('https://ex.com/post?id=7');
    expect(readPageInfo(document)).toEqual({
      title: 'Page title',
      description: 'A page description',
      link: 'https://ex.com/post?id=7',
    });
  });

  it('falls back to og tags and skips the link when disabled', () => {
    document.head.innerHTML = `
      <meta property="og:title" content="Og title" />
      <meta property="og:description" content="Og description" />
      <link rel="canonical" href="https://ex.com/post" />
    `;

    expect(readPageTitle(document)).toBe('Og title');
    expect(readPageDescription(document)).toBe('Og description');
    expect(readPageInfo(document, false).link).toBe('');
  });
});

describe('formatPageInfo', () => {
  it('joins non-empty parts with a colon', () => {
    expect(formatPageInfo({ title: 'T', description: 'D', link: 'L' })).toBe('T:D:L');
    expect(formatPageInfo({ title: 'T', description: '', link: 'L' })).toBe('T:L');
  });
});

describe('buildTranslatedPageInfo', () => {
  it('translates title and description and keeps the cleaned link', async () => {
    document.head.innerHTML = `
      <meta name="description" content="Original description" />
      <link rel="canonical" href="https://ex.com/post?utm_source=news&id=7" />
    `;
    document.title = 'Original title';
    mockTranslate.mockResolvedValue({
      translations: [
        { id: 'page-info-title', text: 'Titulo' },
        { id: 'page-info-description', text: 'Descripcion' },
      ],
      fromCache: 0,
      fromApi: 2,
    });

    const { buildTranslatedPageInfo } = await import('@/features/copy-page/copy-page');
    const result = await buildTranslatedPageInfo(settings, 'es');

    expect(mockTranslate).toHaveBeenCalledWith([
      { id: 'page-info-title', text: 'Original title' },
      { id: 'page-info-description', text: 'Original description' },
    ]);
    expect(result).toBe('Titulo:Descripcion:https://ex.com/post?id=7');
  });

  it('skips the link when the option is disabled', async () => {
    document.title = 'Original title';
    mockTranslate.mockResolvedValue({
      translations: [{ id: 'page-info-title', text: 'Titulo' }],
      fromCache: 0,
      fromApi: 1,
    });

    const { buildTranslatedPageInfo } = await import('@/features/copy-page/copy-page');
    const result = await buildTranslatedPageInfo(
      { ...settings, copyIncludeLink: false },
      'es',
    );

    expect(result).toBe('Titulo');
  });
});
