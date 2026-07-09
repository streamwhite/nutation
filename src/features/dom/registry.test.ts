import { describe, expect, it } from 'vitest';
import { TextNodeRegistry } from '@/features/dom/registry';

describe('TextNodeRegistry release', () => {
  it('allows re-register after release', () => {
    document.body.innerHTML = '<p id="p">Hello</p>';
    const node = document.getElementById('p')!.firstChild as Text;
    const registry = new TextNodeRegistry();

    const id = registry.register(node, 'Hello');
    expect(registry.hasNode(node)).toBe(true);

    registry.release([id]);
    expect(registry.hasNode(node)).toBe(false);

    const nextId = registry.register(node, 'Hello');
    expect(nextId).not.toBe(id);
  });
});
