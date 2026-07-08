import { describe, expect, it } from 'vitest';
import { collectTextNodes, isMeaningfulText, shouldSkipElement } from '@/features/dom/collect-text';

describe('isMeaningfulText', () => {
  it('rejects empty and whitespace', () => {
    expect(isMeaningfulText('')).toBe(false);
    expect(isMeaningfulText('   ')).toBe(false);
    expect(isMeaningfulText(null)).toBe(false);
  });

  it('accepts non-empty text', () => {
    expect(isMeaningfulText('hello')).toBe(true);
  });
});

describe('shouldSkipElement', () => {
  it('skips script style and code ancestors', () => {
    document.body.innerHTML = `
      <div id="ok">visible</div>
      <script id="scr">var x = 1</script>
      <style id="sty">.a{}</style>
      <pre id="pre">code block</pre>
      <code id="code">inline</code>
    `;

    expect(shouldSkipElement(document.getElementById('ok'))).toBe(false);
    expect(shouldSkipElement(document.getElementById('scr'))).toBe(true);
    expect(shouldSkipElement(document.getElementById('sty'))).toBe(true);
    expect(shouldSkipElement(document.getElementById('pre'))).toBe(true);
    expect(shouldSkipElement(document.getElementById('code'))).toBe(true);
  });

  it('skips contenteditable', () => {
    document.body.innerHTML = '<div id="edit" contenteditable="true">edit me</div>';
    expect(shouldSkipElement(document.getElementById('edit'))).toBe(true);
  });
});

describe('collectTextNodes', () => {
  it('collects visible text and skips non-content', () => {
    document.body.innerHTML = `
      <p>Hello world</p>
      <script>ignored</script>
      <style>.x{}</style>
      <pre>keep out</pre>
      <div><span>Nested text</span></div>
    `;

    const collected = collectTextNodes(document.body);
    const texts = collected.map((item) => item.text.trim());

    expect(texts).toContain('Hello world');
    expect(texts).toContain('Nested text');
    expect(texts).not.toContain('ignored');
    expect(texts).not.toContain('keep out');
  });
});
