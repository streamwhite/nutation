import { describe, expect, it } from 'vitest';
import {
  getProviderPreset,
  inferProviderFromBaseUrl,
  listProvidersByCategory,
  PROVIDER_CATEGORY_LABELS,
  PROVIDER_IDS,
} from '@/shared/providers';

describe('provider categories', () => {
  it('groups gateways and direct providers', () => {
    const gateways = listProvidersByCategory('gateway').map((item) => item.id);
    const direct = listProvidersByCategory('direct').map((item) => item.id);
    expect(gateways).toEqual(['openrouter', 'groq', 'together', 'fireworks']);
    expect(direct).toContain('gemini');
    expect(direct).toContain('openai');
    expect(direct).toContain('custom');
    expect(PROVIDER_CATEGORY_LABELS.gateway).toBe('API gateways');
    expect(PROVIDER_IDS.length).toBe(gateways.length + direct.length);
  });

  it('uses DeepSeek-V4-Flash model id for deepseek provider', () => {
    expect(getProviderPreset('deepseek').defaultModel).toBe('deepseek-v4-flash');
  });
});

describe('resolveProviderBaseUrl', () => {
  it('uses preset urls except for custom', async () => {
    const { resolveProviderBaseUrl } = await import('@/shared/providers');
    expect(resolveProviderBaseUrl('gemini')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai',
    );
    expect(resolveProviderBaseUrl('custom', 'https://proxy.example/v1')).toBe(
      'https://proxy.example/v1/chat/completions',
    );
  });
});

describe('inferProviderFromBaseUrl', () => {
  it('detects provider from base url', () => {
    expect(inferProviderFromBaseUrl('https://openrouter.ai/api/v1')).toBe('openrouter');
    expect(inferProviderFromBaseUrl('https://api.groq.com/openai/v1')).toBe('groq');
    expect(inferProviderFromBaseUrl('https://api.together.xyz/v1')).toBe('together');
    expect(inferProviderFromBaseUrl('https://api.fireworks.ai/inference/v1')).toBe('fireworks');
    expect(inferProviderFromBaseUrl('https://api.deepseek.com/v1')).toBe('deepseek');
    expect(inferProviderFromBaseUrl('https://api.mistral.ai/v1')).toBe('mistral');
    expect(inferProviderFromBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai'))
      .toBe('gemini');
    expect(inferProviderFromBaseUrl('https://api.example.com/v1')).toBe('custom');
  });
});
