import { beforeEach, describe, expect, it } from 'vitest';
import { collectTextNodes } from '@/features/dom/collect-text';
import { createContentScopeFilter } from '@/features/dom/content-scope';

function collectScopedText(doc: Document, isListingFeed: boolean): string[] {
  return collectTextNodes(doc.body, {
    isInScope: createContentScopeFilter(doc, isListingFeed),
  }).map((item) => item.text.replace(/\s+/g, ' ').trim());
}

describe('article content scope', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the article body and visible hero headline, dropping page chrome', () => {
    document.body.innerHTML = `
      <header role="banner">
        <h1>Example News</h1>
        <nav>Site menu</nav>
      </header>
      <div class="article-hero">
        <h1 class="article-title">Hero headline outside main</h1>
      </div>
      <main>
        <article>
          <p>First body paragraph.</p>
          <h2>Section heading</h2>
          <p>Second body paragraph.</p>
        </article>
        <section class="related-posts">
          <h2>Related stories</h2>
          <a href="/other"><h3>Related headline</h3></a>
          <p>Related blurb.</p>
        </section>
        <section class="newsletter">
          <p>Subscribe to our newsletter.</p>
        </section>
        <section id="comments">
          <p>Reader comment.</p>
        </section>
      </main>
      <footer>Footer links</footer>
    `;

    const texts = collectScopedText(document, false);

    expect(texts).toContain('Hero headline outside main');
    expect(texts).toContain('First body paragraph.');
    expect(texts).toContain('Section heading');
    expect(texts).toContain('Second body paragraph.');
    expect(texts).not.toContain('Example News');
    expect(texts).not.toContain('Related stories');
    expect(texts).not.toContain('Related headline');
    expect(texts).not.toContain('Related blurb.');
    expect(texts).not.toContain('Subscribe to our newsletter.');
    expect(texts).not.toContain('Reader comment.');
    expect(texts).not.toContain('Footer links');
  });

  it('drops related modules even when they sit inside main', () => {
    document.body.innerHTML = `
      <main>
        <article>
          <p>Article body copy.</p>
          <a href="/read">Read more</a>
        </article>
        <div aria-label="Related articles">
          <a href="/other"><h3>Another story</h3></a>
          <p>Another story deck.</p>
        </div>
      </main>
    `;

    const texts = collectScopedText(document, false);

    expect(texts).toContain('Article body copy.');
    expect(texts).toContain('Read more');
    expect(texts).not.toContain('Another story');
    expect(texts).not.toContain('Another story deck.');
  });

  it('uses the article body selector instead of the whole page', () => {
    document.body.innerHTML = `
      <header><h1>Site title</h1></header>
      <article>
        <div class="entry-content">
          <p>Only the post body.</p>
        </div>
        <section class="comments"><p>Comment text.</p></section>
      </article>
    `;

    const texts = collectScopedText(document, false);

    expect(texts).toContain('Only the post body.');
    expect(texts).not.toContain('Site title');
    expect(texts).not.toContain('Comment text.');
  });
});

describe('listing content scope', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps feed titles and descriptions, dropping metadata and actions', () => {
    document.body.innerHTML = `
      <main>
        <h1>Tech</h1>
        <div class="feed">
          <article class="card">
            <a href="/story-1"><h2>First story headline</h2></a>
            <p>First story description.</p>
            <time datetime="2026-01-01">January 1, 2026</time>
            <div class="post-tags">AI</div>
            <a class="read-more" href="/story-1">Read more</a>
          </article>
          <article class="card">
            <a href="/story-2"><h2>Second story headline</h2></a>
            <p>Second story description.</p>
          </article>
          <article class="card">
            <a href="/story-3"><h2>Third story headline</h2></a>
            <p>Third story description.</p>
          </article>
        </div>
      </main>
      <aside class="sidebar">
        <h2>Trending</h2>
        <p>Sidebar blurb.</p>
      </aside>
    `;

    const texts = collectScopedText(document, true);

    expect(texts).toContain('Tech');
    expect(texts).toContain('First story headline');
    expect(texts).toContain('First story description.');
    expect(texts).toContain('Second story headline');
    expect(texts).toContain('Second story description.');
    expect(texts).toContain('Third story headline');
    expect(texts).toContain('Third story description.');
    expect(texts).not.toContain('January 1, 2026');
    expect(texts).not.toContain('AI');
    expect(texts).toContain('Read more');
    expect(texts).not.toContain('Trending');
    expect(texts).not.toContain('Sidebar blurb.');
  });

  it('drops class-based sidebars that sit inside main', () => {
    document.body.innerHTML = `
      <main>
        <div class="feed">
          <article>
            <a href="/story-1"><h2>First feed headline</h2></a>
            <p>First feed description.</p>
          </article>
          <article>
            <a href="/story-2"><h2>Second feed headline</h2></a>
            <p>Second feed description.</p>
          </article>
        </div>
        <div class="sidebar">
          <h2>Most read</h2>
          <p>Sidebar blurb.</p>
        </div>
      </main>
    `;

    const texts = collectScopedText(document, true);

    expect(texts).toContain('First feed headline');
    expect(texts).toContain('First feed description.');
    expect(texts).not.toContain('Most read');
    expect(texts).not.toContain('Sidebar blurb.');
  });

  it('handles flat feeds where descriptions are siblings of headline links', () => {
    document.body.innerHTML = `
      <main>
        <a href="/story-1"><h2>Flat story one headline</h2></a>
        <p>Flat description one.</p>
        <a href="/story-2"><h2>Flat story two headline</h2></a>
        <p>Flat description two.</p>
        <a href="/story-3"><h2>Flat story three headline</h2></a>
        <p>Flat description three.</p>
      </main>
    `;

    const texts = collectScopedText(document, true);

    expect(texts).toContain('Flat story one headline');
    expect(texts).toContain('Flat description one.');
    expect(texts).toContain('Flat story two headline');
    expect(texts).toContain('Flat description two.');
    expect(texts).toContain('Flat story three headline');
    expect(texts).toContain('Flat description three.');
  });

  it('detects titles when a feed uses plain links instead of headings', () => {
    document.body.innerHTML = `
      <main>
        <div class="feed">
          <a href="/story-1">First plain link story title</a>
          <p>First plain story description.</p>
          <a href="/story-2">Second plain link story title</a>
          <p>Second plain story description.</p>
          <a href="/story-3">Third plain link story title</a>
          <p>Third plain story description.</p>
          <a href="/story-1">Read more</a>
        </div>
      </main>
    `;

    const texts = collectScopedText(document, true);

    expect(texts).toContain('First plain link story title');
    expect(texts).toContain('First plain story description.');
    expect(texts).toContain('Second plain link story title');
    expect(texts).toContain('Second plain story description.');
    expect(texts).toContain('Third plain link story title');
    expect(texts).toContain('Third plain story description.');
    expect(texts).toContain('Read more');
  });

  it('extends the scope with feed items appended after the first scan', () => {
    document.body.innerHTML = `
      <main>
        <div class="feed" id="feed">
          <article>
            <a href="/story-1"><h2>First feed headline</h2></a>
            <p>First feed description.</p>
          </article>
          <article>
            <a href="/story-2"><h2>Second feed headline</h2></a>
            <p>Second feed description.</p>
          </article>
        </div>
      </main>
    `;

    const filter = createContentScopeFilter(document, true);
    const feed = document.getElementById('feed')!;
    const addedHeadline = document.createElement('article');
    addedHeadline.innerHTML = `
      <a href="/story-3"><h2>Third feed headline</h2></a>
      <p>Third feed description.</p>
    `;
    feed.appendChild(addedHeadline);

    const find = (text: string): Element => (
      Array.from(document.querySelectorAll('*')).find((element) => (
        element.textContent?.trim() === text
      ))!
    );
    expect(filter(find('Third feed headline'))).toBe(false);

    filter.addRoots?.([addedHeadline]);

    const texts = collectTextNodes(document.body, { isInScope: filter })
      .map((item) => item.text.replace(/\s+/g, ' ').trim());
    expect(texts).toContain('Third feed headline');
    expect(texts).toContain('Third feed description.');
  });

  it('extends a link-only feed with a single appended link and description', () => {
    document.body.innerHTML = `
      <main>
        <div class="feed" id="feed">
          <a href="/story-1">First plain link story title</a>
          <p>First plain story description.</p>
          <a href="/story-2">Second plain link story title</a>
          <p>Second plain story description.</p>
        </div>
      </main>
    `;

    const filter = createContentScopeFilter(document, true);
    const feed = document.getElementById('feed')!;
    const link = document.createElement('a');
    link.href = '/story-3';
    link.textContent = 'Third plain link story title';
    const description = document.createElement('p');
    description.textContent = 'Third plain story description.';
    feed.append(link, description);

    filter.addRoots?.([link]);

    const texts = collectTextNodes(document.body, { isInScope: filter })
      .map((item) => item.text.replace(/\s+/g, ' ').trim());
    expect(texts).toContain('Third plain link story title');
    expect(texts).toContain('Third plain story description.');
  });

  it('keeps read-more buttons clickable and translated', () => {
    document.body.innerHTML = `
      <main>
        <article>
          <a href="/story-1"><h2>Button story headline</h2></a>
          <p>Button story description.</p>
          <button>Read more</button>
          <button>Play video</button>
        </article>
        <article>
          <a href="/story-2"><h2>Second button headline</h2></a>
          <p>Second button description.</p>
          <button>Read more</button>
        </article>
      </main>
    `;

    const texts = collectScopedText(document, true);

    expect(texts).toContain('Button story headline');
    expect(texts).toContain('Read more');
    expect(texts).not.toContain('Play video');
  });

  it('falls back to page scope when no feed items are recognizable', () => {
    document.body.innerHTML = '<main><p>Plain paragraph content.</p></main>';

    const texts = collectScopedText(document, true);

    expect(texts).toEqual(['Plain paragraph content.']);
  });
});
