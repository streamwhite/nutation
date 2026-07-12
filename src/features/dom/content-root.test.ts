import { describe, expect, it } from 'vitest';
import { collectTextNodes } from '@/features/dom/collect-text';
import { findCollectionRoot, findMainContentRoot, isChromeElement } from '@/features/dom/content-root';

describe('isChromeElement', () => {
  it('detects nav header footer aside and roles', () => {
    document.body.innerHTML = `
      <nav id="nav">Nav</nav>
      <header id="hdr">Header</header>
      <footer id="ftr">Footer</footer>
      <aside id="aside">Aside</aside>
      <div id="search" role="search">Search</div>
      <div id="ok">Content</div>
    `;

    expect(isChromeElement(document.getElementById('nav'))).toBe(true);
    expect(isChromeElement(document.getElementById('hdr'))).toBe(true);
    expect(isChromeElement(document.getElementById('ftr'))).toBe(true);
    expect(isChromeElement(document.getElementById('aside'))).toBe(true);
    expect(isChromeElement(document.getElementById('search'))).toBe(true);
    expect(isChromeElement(document.getElementById('ok'))).toBe(false);
  });

  it('does not treat article headline headers as chrome', () => {
    document.body.innerHTML = `
      <main>
        <article>
          <header data-testid="headline" id="article-header">
            <h1 id="main-heading">Match headline</h1>
          </header>
        </article>
      </main>
    `;

    expect(isChromeElement(document.getElementById('article-header'))).toBe(false);
    expect(isChromeElement(document.getElementById('main-heading'))).toBe(false);
  });

  it('keeps site nav header chrome while allowing page headlines', () => {
    document.body.innerHTML = `
      <header id="site-header">
        <h1>Site Logo</h1>
        <nav id="site-nav">Menu</nav>
      </header>
      <div id="page">
        <h1 class="Page-headline" id="page-headline">Article headline</h1>
      </div>
    `;

    expect(isChromeElement(document.getElementById('site-nav'))).toBe(true);
    expect(isChromeElement(document.getElementById('site-header'))).toBe(true);
    expect(isChromeElement(document.getElementById('page-headline'))).toBe(false);
  });
});

describe('findMainContentRoot', () => {
  it('prefers main landmark over body chrome', () => {
    document.body.innerHTML = `
      <nav>Menu item one</nav>
      <main id="main"><p>${'Article body text '.repeat(20)}</p></main>
      <footer>Copyright</footer>
    `;

    const root = findMainContentRoot(document);
    expect(root.id).toBe('main');
  });

  it('falls back to role=main then body', () => {
    document.body.innerHTML = `
      <div role="main" id="role-main"><p>${'Primary content '.repeat(20)}</p></div>
      <aside>Sidebar</aside>
    `;
    expect(findMainContentRoot(document).id).toBe('role-main');

    document.body.innerHTML = `
      <header>Site</header>
      <article id="post"><p>${'Blog post content '.repeat(20)}</p></article>
      <footer>End</footer>
    `;
    expect(findMainContentRoot(document)).toBe(document.body);
  });

  it('uses body when no main landmark exists', () => {
    document.body.innerHTML = '<div id="wrap"><p>Short</p></div>';
    const root = findMainContentRoot(document);
    expect(root).toBe(document.body);
  });
});

describe('findCollectionRoot', () => {
  it('uses main when present and body otherwise', () => {
    document.body.innerHTML = `
      <nav id="site-nav">Site menu</nav>
      <main id="main">
        <h2>Story one headline</h2>
        <p>${'Summary one '.repeat(8)}</p>
        <h2>Story two headline</h2>
        <p>${'Summary two '.repeat(8)}</p>
      </main>
    `;

    const root = findCollectionRoot(document);
    const texts = collectTextNodes(root).map((item) => item.text.trim());

    expect(root.id).toBe('main');
    expect(texts).toContain('Story one headline');
    expect(texts).not.toContain('Site menu');
  });

  it('falls back to body so content outside article tags is collected', () => {
    document.body.innerHTML = `
      <nav id="site-nav">Site menu</nav>
      <section id="stream">
        <h2>Story one headline</h2>
        <p>${'Summary one '.repeat(8)}</p>
        <h2>Story two headline</h2>
        <p>${'Summary two '.repeat(8)}</p>
      </section>
    `;

    const root = findCollectionRoot(document);
    const texts = collectTextNodes(root).map((item) => item.text.trim());

    expect(root).toBe(document.body);
    expect(texts).toContain('Story one headline');
    expect(texts).not.toContain('Site menu');
  });
});
