import { collectTextNodes } from '@/features/dom/collect-text';
import { observeMutations, observeVisibleElements } from '@/features/dom/observers';
import { TextNodeRegistry } from '@/features/dom/registry';
import { chunkArray } from '@/features/translate/batch';
import { runWithConcurrency } from '@/features/translate/concurrency';
import type {
  ExtensionMessage,
  TabStatus,
  TextChunk,
  TranslateBatchResponse,
} from '@/features/translate/types';
import {
  INTERSECTION_ROOT_MARGIN,
  MESSAGE_TYPES,
  TRANSLATE_BATCH_SIZE,
  TRANSLATE_CONCURRENCY,
} from '@/shared/constants';

const VIEWPORT_MARGIN_PX = Number.parseInt(INTERSECTION_ROOT_MARGIN, 10) || 200;

function isNearViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom >= -VIEWPORT_MARGIN_PX
    && rect.top <= (window.innerHeight || 0) + VIEWPORT_MARGIN_PX
  );
}

export class PageTranslator {
  private readonly registry = new TextNodeRegistry();
  private active = false;
  private error: string | null = null;
  private targetLang = 'zh-CN';
  private concurrency = TRANSLATE_CONCURRENCY;
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private pendingNodes = new Set<Text>();
  private translating = false;

  getStatus(): TabStatus {
    return {
      active: this.active,
      error: this.error,
      translatedCount: this.registry.translatedCount(),
    };
  }

  async start(targetLang: string, concurrency: number = TRANSLATE_CONCURRENCY): Promise<TabStatus> {
    this.targetLang = targetLang;
    this.concurrency = concurrency;
    this.error = null;
    this.active = true;
    this.ensureObservers();
    this.queueVisibleCandidates();
    await this.flushQueue();
    return this.getStatus();
  }

  stop(): TabStatus {
    this.active = false;
    this.pendingNodes.clear();
    this.teardownObservers();
    this.registry.restoreAll();
    this.registry.clear();
    this.error = null;
    return this.getStatus();
  }

  private ensureObservers(): void {
    if (this.mutationObserver) {
      return;
    }

    this.mutationObserver = observeMutations(document.body, () => {
      if (!this.active) {
        return;
      }
      this.queueVisibleCandidates();
    });
  }

  private teardownObservers(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
  }

  private enqueueNode(node: Text): void {
    if (!this.registry.hasNode(node)) {
      this.pendingNodes.add(node);
    }
  }

  private queueVisibleCandidates(): void {
    const collected = collectTextNodes(document.body);
    const deferredParents = new Set<Element>();

    for (const item of collected) {
      if (this.registry.hasNode(item.node) || this.pendingNodes.has(item.node)) {
        continue;
      }

      const parent = item.node.parentElement;
      if (!parent) {
        continue;
      }

      if (isNearViewport(parent)) {
        this.enqueueNode(item.node);
        continue;
      }

      deferredParents.add(parent);
    }

    this.intersectionObserver?.disconnect();
    if (deferredParents.size === 0) {
      this.intersectionObserver = null;
      return;
    }

    this.intersectionObserver = observeVisibleElements(Array.from(deferredParents), (element) => {
      if (!this.active) {
        return;
      }
      for (const item of collectTextNodes(element)) {
        this.enqueueNode(item.node);
      }
      void this.flushQueue();
    });
  }

  private async flushQueue(): Promise<void> {
    if (!this.active || this.translating || this.pendingNodes.size === 0) {
      return;
    }

    this.translating = true;
    try {
      const nodes = Array.from(this.pendingNodes);
      this.pendingNodes.clear();

      const chunks: TextChunk[] = [];
      for (const node of nodes) {
        if (!node.isConnected || this.registry.hasNode(node)) {
          continue;
        }
        const original = node.textContent ?? '';
        if (!original.trim()) {
          continue;
        }
        const id = this.registry.register(node, original);
        chunks.push({ id, text: original });
      }

      const batches = chunkArray(chunks, TRANSLATE_BATCH_SIZE);
      await runWithConcurrency(batches, this.concurrency, async (batch) => {
        if (!this.active) {
          return;
        }
        await this.translateAndApply(batch);
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.translating = false;
      if (this.active && this.pendingNodes.size > 0) {
        void this.flushQueue();
      }
    }
  }

  private async translateAndApply(batch: TextChunk[]): Promise<void> {
    const response = await browser.runtime.sendMessage({
      type: MESSAGE_TYPES.TRANSLATE_BATCH,
      texts: batch,
      targetLang: this.targetLang,
    } satisfies ExtensionMessage) as TranslateBatchResponse;

    if (!response?.ok) {
      throw new Error(response?.error || 'Translation failed');
    }

    for (const item of response.translations) {
      this.registry.applyTranslation(item.id, item.text);
    }
  }
}
