import { describe, expect, it } from 'vitest';
import { isMetadataElement, isShareElement } from '@/features/dom/skip-zones';

describe('isMetadataElement', () => {
  it('skips author byline and publish date regions', () => {
    document.body.innerHTML = `
      <article>
        <div class="post-meta">
          <span class="author">Jane Doe</span>
          <time datetime="2025-01-01">January 1, 2025</time>
        </div>
        <p id="body">Article paragraph</p>
      </article>
    `;

    expect(isMetadataElement(document.querySelector('.author'))).toBe(true);
    expect(isMetadataElement(document.querySelector('time'))).toBe(true);
    expect(isMetadataElement(document.getElementById('body'))).toBe(false);
  });

  it('skips breadcrumb and tag lists', () => {
    document.body.innerHTML = `
      <nav class="breadcrumb"><a href="/">Home</a></nav>
      <ul class="post-tags"><li>News</li></ul>
      <p id="keep">Keep me</p>
    `;

    expect(isMetadataElement(document.querySelector('.breadcrumb'))).toBe(true);
    expect(isMetadataElement(document.querySelector('.post-tags'))).toBe(true);
    expect(isMetadataElement(document.getElementById('keep'))).toBe(false);
  });

  it('does not treat unrelated class tokens as metadata', () => {
    document.body.innerHTML = `
      <div class="metaphor-wrapper">
        <p id="keep">Keep me</p>
      </div>
    `;

    expect(isMetadataElement(document.getElementById('keep'))).toBe(false);
  });

  it('does not treat wordpress status-publish cards as metadata', () => {
    document.body.innerHTML = `
      <article class="relative group card-list-square post-2162496 post type-post status-publish format-standard">
        <h2 id="headline">Flores Hobbits eating habits</h2>
        <p id="deck">Summary copy for the story card.</p>
      </article>
      <div class="post-meta">
        <span class="author">Jane Doe</span>
      </div>
    `;

    expect(isMetadataElement(document.getElementById('headline'))).toBe(false);
    expect(isMetadataElement(document.getElementById('deck'))).toBe(false);
    expect(isMetadataElement(document.querySelector('.author'))).toBe(true);
  });
});

describe('isShareElement', () => {
  it('skips share toolbars and social buttons', () => {
    document.body.innerHTML = `
      <div class="share-buttons">
        <button aria-label="Share on Twitter">Tweet</button>
      </div>
      <p id="keep">Article text</p>
    `;

    expect(isShareElement(document.querySelector('.share-buttons'))).toBe(true);
    expect(isShareElement(document.getElementById('keep'))).toBe(false);
  });
});
