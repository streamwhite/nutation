import { describe, expect, it } from 'vitest';
import {
  bindLanguagePicker,
  searchTargetLanguages,
} from '@/features/options/language-picker';

describe('searchTargetLanguages', () => {
  it('finds languages by name or code', () => {
    expect(searchTargetLanguages('zh-CN')[0]?.code).toBe('zh-CN');
    expect(searchTargetLanguages('Simplified')[0]?.code).toBe('zh-CN');
  });
});

describe('bindLanguagePicker', () => {
  it('works without a selected label element', () => {
    document.body.innerHTML = `
      <input id="search" />
      <input id="code" type="hidden" />
      <div id="results" class="d-none"></div>
    `;
    const searchInput = document.querySelector<HTMLInputElement>('#search')!;
    const codeInput = document.querySelector<HTMLInputElement>('#code')!;
    const results = document.querySelector<HTMLElement>('#results')!;

    bindLanguagePicker({ searchInput, codeInput, results }, 'zh-CN');

    expect(codeInput.value).toBe('zh-CN');
    expect(searchInput.value).toBe('Chinese (Simplified)');
  });
});
