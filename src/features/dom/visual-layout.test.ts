import { describe, expect, it } from 'vitest';
import {
  hasActiveTransform,
  isOutOfFlowPosition,
  isOverflowClipped,
  needsChildViewportProbe,
} from '@/features/dom/visual-layout';

describe('visual layout helpers', () => {
  it('detects out-of-flow positions', () => {
    expect(isOutOfFlowPosition('absolute')).toBe(true);
    expect(isOutOfFlowPosition('fixed')).toBe(true);
    expect(isOutOfFlowPosition('sticky')).toBe(true);
    expect(isOutOfFlowPosition('relative')).toBe(false);
  });

  it('detects active transforms', () => {
    expect(hasActiveTransform('none')).toBe(false);
    expect(hasActiveTransform('translateX(-320px)')).toBe(true);
  });

  it('detects clipped overflow', () => {
    expect(isOverflowClipped('hidden')).toBe(true);
    expect(isOverflowClipped('visible')).toBe(false);
  });
});

describe('needsChildViewportProbe', () => {
  it('detects computed absolute children from stylesheets', () => {
    document.body.innerHTML = `
      <style>
        .card { position: absolute; }
      </style>
      <div id="grid">
        <div class="card">Card</div>
      </div>
    `;

    expect(needsChildViewportProbe(document.getElementById('grid')!)).toBe(true);
  });

  it('detects nested absolute descendants', () => {
    document.body.innerHTML = `
      <div id="wrapper">
        <div id="inner">
          <div id="card" style="position: absolute;">Card</div>
        </div>
      </div>
    `;

    expect(needsChildViewportProbe(document.getElementById('wrapper')!)).toBe(true);
  });

  it('detects transformed tracks and clipping viewports', () => {
    document.body.innerHTML = `
      <div id="track" style="transform: translateX(-320px);">Track</div>
      <div id="viewport" style="overflow: hidden; height: 240px;">Viewport</div>
    `;

    expect(needsChildViewportProbe(document.getElementById('track')!)).toBe(true);
    expect(needsChildViewportProbe(document.getElementById('viewport')!)).toBe(true);
    expect(needsChildViewportProbe(document.getElementById('plain') ?? document.createElement('div'))).toBe(false);
  });
});
