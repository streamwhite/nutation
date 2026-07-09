import { describe, expect, it } from 'vitest';
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

  it('falls back to role=main then article', () => {
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
    expect(findMainContentRoot(document).id).toBe('post');
  });

  it('uses body when no main content landmark exists', () => {
    document.body.innerHTML = '<div id="wrap"><p>Short</p></div>';
    const root = findMainContentRoot(document);
    expect(root).toBe(document.body);
  });
});

describe('findCollectionRoot', () => {
  it('widens to body when a flourish embed sits outside the article', () => {
    document.body.innerHTML = `
      <article id="post"><p>${'Article body text '.repeat(20)}</p></article>
      <section id="fl-layout-primary-container" class="fl-layout-container">
        <div id="cards-inner">
          <div role="article" class="card-wrapper" id="card-0">
            <h3>Maliha, 11 months</h3>
            <p>Maliha died on 12 April.</p>
          </div>
          <div role="article" class="card-wrapper" id="card-1">
            <h3>Akira Haidar, 4 years</h3>
            <p>Akira died on 2 April.</p>
          </div>
        </div>
      </section>
    `;

    expect(findMainContentRoot(document).id).toBe('post');
    expect(findCollectionRoot(document)).toBe(document.body);
  });

  it('keeps the article root when the embed is inside it', () => {
    document.body.innerHTML = `
      <article id="post">
        <p>${'Article body text '.repeat(20)}</p>
        <section id="fl-layout-primary-container" class="fl-layout-container">
          <p>Embedded card copy</p>
        </section>
      </article>
    `;

    expect(findCollectionRoot(document).id).toBe('post');
  });
});
