import { describe, expect, it } from 'vitest';
import { findCollectionRoot } from '@/features/dom/content-root';
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

  it('skips chrome regions inside body', () => {
    document.body.innerHTML = `
      <nav>Skip nav</nav>
      <main><p>Keep main</p></main>
      <footer>Skip footer</footer>
    `;

    const texts = collectTextNodes(document.body).map((item) => item.text.trim());
    expect(texts).toContain('Keep main');
    expect(texts).not.toContain('Skip nav');
    expect(texts).not.toContain('Skip footer');
  });

  it('skips author date share and breadcrumb metadata', () => {
    document.body.innerHTML = `
      <article>
        <nav class="breadcrumb"><a href="/">Home</a></nav>
        <div class="post-meta">
          <span class="author">Jane Doe</span>
          <time datetime="2025-01-01">January 1, 2025</time>
        </div>
        <div class="share-buttons">Share on Twitter</div>
        <p id="body">Article paragraph</p>
      </article>
    `;

    const texts = collectTextNodes(document.body).map((item) => item.text.trim());
    expect(texts).toContain('Article paragraph');
    expect(texts).not.toContain('Jane Doe');
    expect(texts).not.toContain('January 1, 2025');
    expect(texts).not.toContain('Share on Twitter');
    expect(texts).not.toContain('Home');
  });

  it('prunes below-viewport subtrees and defers them', () => {
    document.body.innerHTML = `
      <div id="root">
        <p id="visible">Visible paragraph</p>
        <section id="below"><p>Below fold</p></section>
      </div>
    `;

    const visible = document.getElementById('visible')!;
    const below = document.getElementById('below')!;
    visible.getBoundingClientRect = () => ({
      top: 10,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 10,
      toJSON: () => ({}),
    });
    below.getBoundingClientRect = () => ({
      top: 2000,
      bottom: 2100,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 2000,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });

    const deferred: Element[] = [];
    const collected = collectTextNodes(document.getElementById('root')!, {
      viewportMarginPx: 100,
      onDeferSubtree: (element) => deferred.push(element),
    });

    expect(collected.map((item) => item.text.trim())).toEqual(['Visible paragraph']);
    expect(deferred).toContain(below);
  });

  it('keeps visible absolute-positioned card text inside offscreen containers', () => {
    document.body.innerHTML = `
      <section id="root">
        <div id="offscreen-grid">
          <div id="card" style="position: absolute;">
            <h3 id="title">Maliha, 11 months</h3>
            <p id="summary">Maliha died on 12 April.</p>
          </div>
        </div>
      </section>
    `;

    const root = document.getElementById('root')!;
    const grid = document.getElementById('offscreen-grid')!;
    const card = document.getElementById('card')!;
    const title = document.getElementById('title')!;
    const summary = document.getElementById('summary')!;

    root.getBoundingClientRect = () => ({
      top: 0,
      bottom: 600,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    grid.getBoundingClientRect = () => ({
      top: 1600,
      bottom: 2200,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 1600,
      toJSON: () => ({}),
    });
    card.getBoundingClientRect = () => ({
      top: 20,
      bottom: 320,
      left: 0,
      right: 240,
      width: 240,
      height: 300,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    });
    title.getBoundingClientRect = card.getBoundingClientRect;
    summary.getBoundingClientRect = card.getBoundingClientRect;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });

    const deferred: Element[] = [];
    const collected = collectTextNodes(root, {
      viewportMarginPx: 100,
      onDeferSubtree: (element) => deferred.push(element),
    });

    const texts = collected.map((item) => item.text.trim());
    expect(texts).toContain('Maliha, 11 months');
    expect(texts).toContain('Maliha died on 12 April.');
    expect(deferred).not.toContain(grid);
  });

  it('keeps visible card text when absolute positioning comes from css classes', () => {
    document.body.innerHTML = `
      <style>
        .card { position: absolute; }
      </style>
      <section id="root">
        <div id="offscreen-grid">
          <div class="card" id="card">
            <p id="summary">Vaccine clinic had no doses left.</p>
          </div>
        </div>
      </section>
    `;

    const root = document.getElementById('root')!;
    const grid = document.getElementById('offscreen-grid')!;
    const summary = document.getElementById('summary')!;

    root.getBoundingClientRect = () => ({
      top: 0,
      bottom: 600,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    grid.getBoundingClientRect = () => ({
      top: 1600,
      bottom: 2200,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 1600,
      toJSON: () => ({}),
    });
    summary.getBoundingClientRect = () => ({
      top: 40,
      bottom: 80,
      left: 20,
      right: 260,
      width: 240,
      height: 40,
      x: 20,
      y: 40,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });

    const texts = collectTextNodes(root, { viewportMarginPx: 100 })
      .map((item) => item.text.trim());

    expect(texts).toContain('Vaccine clinic had no doses left.');
  });

  it('collects visible text from transformed tracks inside offscreen containers', () => {
    document.body.innerHTML = `
      <section id="root">
        <div id="offscreen-shell">
          <div id="track" style="transform: translateY(-1200px);">
            <p id="visible">Fiha died on 25 April.</p>
          </div>
        </div>
      </section>
    `;

    const root = document.getElementById('root')!;
    const shell = document.getElementById('offscreen-shell')!;
    const visible = document.getElementById('visible')!;

    root.getBoundingClientRect = () => ({
      top: 0,
      bottom: 600,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    shell.getBoundingClientRect = () => ({
      top: 1700,
      bottom: 2300,
      left: 0,
      right: 300,
      width: 300,
      height: 600,
      x: 0,
      y: 1700,
      toJSON: () => ({}),
    });
    visible.getBoundingClientRect = () => ({
      top: 120,
      bottom: 150,
      left: 16,
      right: 280,
      width: 264,
      height: 30,
      x: 16,
      y: 120,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });

    const texts = collectTextNodes(root, { viewportMarginPx: 100 })
      .map((item) => item.text.trim());

    expect(texts).toContain('Fiha died on 25 April.');
  });

  it('collects only the visible slide in a transformed horizontal carousel', () => {
    document.body.innerHTML = `
      <section id="root">
        <div id="viewport" style="overflow: hidden; width: 320px; height: 240px;">
          <div id="track" style="transform: translateX(-320px);">
            <div id="slide-1"><p id="hidden">Hidden slide copy</p></div>
            <div id="slide-2"><p id="visible">Visible slide copy</p></div>
          </div>
        </div>
      </section>
    `;

    const root = document.getElementById('root')!;
    const viewport = document.getElementById('viewport')!;
    const hidden = document.getElementById('hidden')!;
    const visible = document.getElementById('visible')!;

    root.getBoundingClientRect = viewport.getBoundingClientRect = () => ({
      top: 80,
      bottom: 320,
      left: 40,
      right: 360,
      width: 320,
      height: 240,
      x: 40,
      y: 80,
      toJSON: () => ({}),
    });
    hidden.getBoundingClientRect = () => ({
      top: 100,
      bottom: 130,
      left: -560,
      right: -280,
      width: 280,
      height: 30,
      x: -560,
      y: 100,
      toJSON: () => ({}),
    });
    visible.getBoundingClientRect = () => ({
      top: 100,
      bottom: 130,
      left: 80,
      right: 360,
      width: 280,
      height: 30,
      x: 80,
      y: 100,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });

    const texts = collectTextNodes(root, { viewportMarginPx: 100 })
      .map((item) => item.text.trim());

    expect(texts).toContain('Visible slide copy');
    expect(texts).not.toContain('Hidden slide copy');
  });

  it('collects only clipped viewport text from tall scrollable embeds', () => {
    document.body.innerHTML = `
      <section id="root">
        <div id="viewport" style="overflow: hidden; height: 240px;">
          <div id="stack">
            <p id="visible">Above the fold copy</p>
            <p id="hidden">Far below copy</p>
          </div>
        </div>
      </section>
    `;

    const root = document.getElementById('root')!;
    const viewport = document.getElementById('viewport')!;
    const visible = document.getElementById('visible')!;
    const hidden = document.getElementById('hidden')!;

    root.getBoundingClientRect = viewport.getBoundingClientRect = () => ({
      top: 100,
      bottom: 340,
      left: 0,
      right: 320,
      width: 320,
      height: 240,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });
    visible.getBoundingClientRect = () => ({
      top: 120,
      bottom: 150,
      left: 16,
      right: 300,
      width: 284,
      height: 30,
      x: 16,
      y: 120,
      toJSON: () => ({}),
    });
    hidden.getBoundingClientRect = () => ({
      top: 1800,
      bottom: 1830,
      left: 16,
      right: 300,
      width: 284,
      height: 30,
      x: 16,
      y: 1800,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });

    const texts = collectTextNodes(root, { viewportMarginPx: 100 })
      .map((item) => item.text.trim());

    expect(texts).toContain('Above the fold copy');
    expect(texts).not.toContain('Far below copy');
  });

  it('collects multiple flourish cards when the collection root is widened to body', () => {
    document.body.innerHTML = `
      <article id="post"><p>${'Article body text '.repeat(20)}</p></article>
      <section id="fl-layout-primary-container" class="fl-layout-container">
        <div id="scroll-outer" style="overflow: hidden; height: 1773px;">
          <div id="cards-inner">
            <div role="article" class="card-wrapper" id="card-0" style="position: absolute;">
              <h3 id="title-0">Maliha, 11 months</h3>
              <p id="summary-0">Maliha died on 12 April.</p>
            </div>
            <div role="article" class="card-wrapper" id="card-1" style="position: absolute;">
              <h3 id="title-1">Akira Haidar, 4 years</h3>
              <p id="summary-1">Akira died on 2 April.</p>
            </div>
          </div>
        </div>
      </section>
    `;

    const root = findCollectionRoot(document);
    const card0 = document.getElementById('card-0')!;
    const card1 = document.getElementById('card-1')!;
    const title0 = document.getElementById('title-0')!;
    const summary0 = document.getElementById('summary-0')!;
    const title1 = document.getElementById('title-1')!;
    const summary1 = document.getElementById('summary-1')!;

    expect(root).toBe(document.body);

    card0.getBoundingClientRect = () => ({
      top: 20,
      bottom: 320,
      left: 8,
      right: 240,
      width: 232,
      height: 300,
      x: 8,
      y: 20,
      toJSON: () => ({}),
    });
    title0.getBoundingClientRect = card0.getBoundingClientRect;
    summary0.getBoundingClientRect = card0.getBoundingClientRect;
    card1.getBoundingClientRect = () => ({
      top: 20,
      bottom: 320,
      left: 260,
      right: 500,
      width: 240,
      height: 300,
      x: 260,
      y: 20,
      toJSON: () => ({}),
    });
    title1.getBoundingClientRect = card1.getBoundingClientRect;
    summary1.getBoundingClientRect = card1.getBoundingClientRect;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });

    const texts = collectTextNodes(root, { viewportMarginPx: 100 })
      .map((item) => item.text.trim());

    expect(texts).toContain('Maliha, 11 months');
    expect(texts).toContain('Maliha died on 12 April.');
    expect(texts).toContain('Akira Haidar, 4 years');
    expect(texts).toContain('Akira died on 2 April.');
  });

  it('collects text rendered inside shadow roots', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host')!;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<p id="shadow-copy">Shadow copy</p>';

    const visible = shadow.getElementById('shadow-copy')!;
    host.getBoundingClientRect = visible.getBoundingClientRect = () => ({
      top: 40,
      bottom: 80,
      left: 20,
      right: 280,
      width: 260,
      height: 40,
      x: 20,
      y: 40,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });

    const texts = collectTextNodes(host, { viewportMarginPx: 100 })
      .map((item) => item.text.trim());

    expect(texts).toContain('Shadow copy');
  });
});
