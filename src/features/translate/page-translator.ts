import { collectTextNodes } from '@/features/dom/collect-text';
import { findCollectionRoot } from '@/features/dom/content-root';
import { createDebouncedCallback, observeMutations, observeVisibleElements } from '@/features/dom/observers';
import { TextNodeRegistry } from '@/features/dom/registry';
import {
  dedupeTextChunks,
  expandTranslations,
  packBatchesByBudget,
  shouldTranslateText,
} from '@/features/translate/batch';
import { InPageTranslator } from '@/features/translate/in-page-translate';
import { formatTimingSummary, StageTimer } from '@/features/translate/stage-timer';
import type { TabStatus, TextChunk } from '@/features/translate/types';
import {
  FLUSH_COALESCE_MS,
  INTERSECTION_ROOT_MARGIN,
  MIN_TRANSLATE_TEXT_LENGTH,
  QUEUE_VISIBLE_DEBOUNCE_MS,
  TRANSLATE_BATCH_FAILURE_DELAY_MS,
  TRANSLATE_BATCH_MAX_CHARS,
  TRANSLATE_BATCH_SIZE,
  TRANSLATE_CONCURRENCY,
  TRANSLATE_FAST_LANE_BATCH_SIZE,
  TRANSLATE_FAST_LANE_MAX_CHARS,
  TRANSLATE_FAST_LANE_PARALLEL,
} from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';

const VIEWPORT_MARGIN_PX = Number.parseInt(INTERSECTION_ROOT_MARGIN, 10) || 400;

type QueuedBatch = {
  batch: TextChunk[];
  expand: Map<string, string[]>;
};

export class PageTranslator {
  private readonly registry = new TextNodeRegistry();
  private readonly timing = new StageTimer();
  private inPageTranslator: InPageTranslator | null = null;
  private active = false;
  private error: string | null = null;
  private targetLang = 'zh-CN';
  private concurrency = TRANSLATE_CONCURRENCY;
  private contentRoot: Element | null = null;
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private pendingNodes = new Set<Text>();
  private batchQueue: QueuedBatch[] = [];
  private inFlightCount = 0;
  private fastLaneDone = false;
  private draining = false;
  private batchRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly scheduleFlush = createDebouncedCallback(
    () => {
      void this.drainQueue();
    },
    FLUSH_COALESCE_MS,
  );
  private readonly scheduleQueueVisible = createDebouncedCallback(
    () => {
      this.queueVisibleCandidates();
    },
    QUEUE_VISIBLE_DEBOUNCE_MS,
  );

  getStatus(): TabStatus {
    return {
      active: this.active,
      error: this.error,
      translatedCount: this.registry.translatedCount(),
      timing: this.timing.getSummary(),
    };
  }

  async start(
    targetLang: string,
    concurrency: number,
    settings: ExtensionSettings,
  ): Promise<TabStatus> {
    this.timing.reset();
    this.targetLang = targetLang;
    this.concurrency = Math.max(concurrency, TRANSLATE_CONCURRENCY);
    this.inPageTranslator = new InPageTranslator(settings, targetLang, this.timing);
    this.batchQueue = [];
    this.inFlightCount = 0;
    this.fastLaneDone = false;
    this.error = null;
    this.active = true;
    this.contentRoot = findCollectionRoot(document);
    this.ensureObservers();
    this.queueVisibleCandidates();
    void this.drainQueue();
    return this.getStatus();
  }

  stop(): TabStatus {
    this.active = false;
    this.inPageTranslator = null;
    this.batchQueue = [];
    this.inFlightCount = 0;
    this.pendingNodes.clear();
    if (this.batchRetryTimer) {
      clearTimeout(this.batchRetryTimer);
      this.batchRetryTimer = null;
    }
    this.scheduleFlush.cancel();
    this.scheduleQueueVisible.cancel();
    this.teardownObservers();
    this.registry.restoreAll();
    this.registry.clear();
    this.contentRoot = null;
    this.error = null;
    this.timing.freeze();
    this.timing.logSummary('stop');
    return this.getStatus();
  }

  private getRoot(): Element {
    const nextRoot = this.contentRoot?.isConnected
      ? this.contentRoot
      : findCollectionRoot(document);

    if (this.contentRoot !== nextRoot) {
      this.contentRoot = nextRoot;
      this.rebindMutationObserver();
    }

    return nextRoot;
  }

  private rebindMutationObserver(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    if (!this.active || !this.contentRoot) {
      return;
    }
    this.ensureObservers();
  }

  private ensureObservers(): void {
    if (this.mutationObserver || !this.contentRoot) {
      return;
    }

    this.mutationObserver = observeMutations(this.contentRoot, () => {
      if (!this.active) {
        return;
      }
      this.scheduleQueueVisible();
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

  private requestFlush(): void {
    this.scheduleFlush();
  }

  private queueVisibleCandidates(): void {
    const root = this.getRoot();
    const deferredParents = new Set<Element>();

    this.timing.start('collect_dom');
    const collected = collectTextNodes(root, {
      viewportMarginPx: VIEWPORT_MARGIN_PX,
      onDeferSubtree: (element) => {
        deferredParents.add(element);
      },
    });
    this.timing.end('collect_dom');

    let enqueued = false;
    for (const item of collected) {
      if (this.registry.hasNode(item.node) || this.pendingNodes.has(item.node)) {
        continue;
      }
      if (!shouldTranslateText(item.text, MIN_TRANSLATE_TEXT_LENGTH)) {
        continue;
      }
      this.enqueueNode(item.node);
      enqueued = true;
    }

    if (enqueued) {
      this.requestFlush();
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
      this.timing.start('collect_dom');
      const visible = collectTextNodes(element, { viewportMarginPx: VIEWPORT_MARGIN_PX });
      this.timing.end('collect_dom');
      for (const item of visible) {
        if (!shouldTranslateText(item.text, MIN_TRANSLATE_TEXT_LENGTH)) {
          continue;
        }
        this.enqueueNode(item.node);
      }
      this.requestFlush();
    });
  }

  private buildChunksFromPending(): TextChunk[] {
    this.timing.start('build_chunks');
    const nodes = Array.from(this.pendingNodes);
    this.pendingNodes.clear();

    const chunks: TextChunk[] = [];
    for (const node of nodes) {
      if (!node.isConnected || this.registry.hasNode(node)) {
        continue;
      }
      const original = node.textContent ?? '';
      if (!shouldTranslateText(original, MIN_TRANSLATE_TEXT_LENGTH)) {
        continue;
      }
      const id = this.registry.register(node, original);
      chunks.push({ id, text: original });
    }
    this.timing.end('build_chunks');
    return chunks;
  }

  private enqueueBatches(unique: TextChunk[], expand: Map<string, string[]>): void {
    let rest = unique;

    if (!this.fastLaneDone) {
      this.fastLaneDone = true;
      const microBatches = packBatchesByBudget(
        unique,
        TRANSLATE_FAST_LANE_BATCH_SIZE,
        TRANSLATE_FAST_LANE_MAX_CHARS,
      );
      const fastLane = microBatches.slice(0, TRANSLATE_FAST_LANE_PARALLEL);
      const fastIds = new Set(fastLane.flat().map((item) => item.id));
      rest = unique.filter((item) => !fastIds.has(item.id));
      for (const batch of fastLane) {
        this.batchQueue.push({ batch, expand });
      }
    }

    const batches = packBatchesByBudget(
      rest,
      TRANSLATE_BATCH_SIZE,
      TRANSLATE_BATCH_MAX_CHARS,
    );
    for (const batch of batches) {
      this.batchQueue.push({ batch, expand });
    }
  }

  private refillBatchQueue(): void {
    if (this.pendingNodes.size === 0) {
      return;
    }
    const chunks = this.buildChunksFromPending();
    if (chunks.length === 0) {
      return;
    }
    const { unique, expand } = dedupeTextChunks(chunks);
    this.enqueueBatches(unique, expand);
  }

  private hasWork(): boolean {
    return this.batchQueue.length > 0 || this.pendingNodes.size > 0;
  }

  private maybeFinishDrain(): void {
    if (this.inFlightCount === 0 && !this.hasWork()) {
      this.draining = false;
      if (this.active) {
        this.timing.logSummary('drain-complete');
      }
    }
  }

  private launchWorkers(): void {
    if (!this.active || !this.inPageTranslator) {
      return;
    }

    while (this.inFlightCount < this.concurrency) {
      if (this.batchQueue.length === 0) {
        this.refillBatchQueue();
      }
      const next = this.batchQueue.shift();
      if (!next) {
        break;
      }

      this.inFlightCount += 1;
      void this.translateAndApply(next.batch, next.expand)
        .catch((error) => {
          this.handleBatchFailure(next.batch, next.expand, error);
        })
        .finally(() => {
          this.inFlightCount -= 1;
          if (this.active && this.pendingNodes.size > 0) {
            this.refillBatchQueue();
          }
          this.launchWorkers();
          this.maybeFinishDrain();
        });
    }

    this.maybeFinishDrain();
  }

  private async drainQueue(): Promise<void> {
    if (!this.active || !this.inPageTranslator) {
      return;
    }
    if (!this.hasWork() && this.inFlightCount > 0) {
      return;
    }
    if (!this.hasWork()) {
      return;
    }

    if (!this.draining) {
      this.draining = true;
    }

    this.refillBatchQueue();
    this.launchWorkers();
  }

  private async translateAndApply(
    batch: TextChunk[],
    expand: Map<string, string[]>,
  ): Promise<void> {
    if (!this.inPageTranslator) {
      return;
    }

    const result = await this.inPageTranslator.translate(batch);
    this.timing.start('apply_dom');
    const expanded = expandTranslations(result.translations, expand);
    for (const item of expanded) {
      if (this.registry.applyTranslation(item.id, item.text)) {
        this.timing.markFirstVisible();
      }
    }
    this.timing.end('apply_dom');
  }

  private handleBatchFailure(
    batch: TextChunk[],
    expand: Map<string, string[]>,
    error: unknown,
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    const retryable = Boolean(
      error
      && typeof error === 'object'
      && 'retryable' in error
      && (error as { retryable?: boolean }).retryable,
    );

    this.error = message;

    if (!retryable || !this.active) {
      return;
    }

    const idsToRelease = new Set<string>();
    const nodesToRetry = new Set<Text>();

    for (const item of batch) {
      const linked = expand.get(item.id) ?? [item.id];
      for (const id of linked) {
        idsToRelease.add(id);
        const record = this.registry.get(id);
        if (record?.node.isConnected) {
          nodesToRetry.add(record.node);
        }
      }
    }

    this.registry.release(Array.from(idsToRelease));
    for (const node of nodesToRetry) {
      this.pendingNodes.add(node);
    }

    this.scheduleBatchRetry();
  }

  private scheduleBatchRetry(): void {
    if (this.batchRetryTimer) {
      return;
    }
    this.batchRetryTimer = setTimeout(() => {
      this.batchRetryTimer = null;
      void this.drainQueue();
    }, TRANSLATE_BATCH_FAILURE_DELAY_MS);
  }
}

export function formatStatusWithTiming(status: TabStatus): string {
  const base = status.active
    ? `Translating… (${status.translatedCount} nodes)`
    : `Idle (${status.translatedCount} nodes)`;
  if (!status.timing) {
    return base;
  }
  return `${base} | ${formatTimingSummary(status.timing)}`;
}
