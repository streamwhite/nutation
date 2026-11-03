import { collectTextNodes } from '@/features/dom/collect-text';
import { createContentScopeFilter, type ContentScopeFilter } from '@/features/dom/content-scope';
import { findCollectionRoot } from '@/features/dom/content-root';
import { isLikelyListingFeed } from '@/features/dom/page-kind';
import {
  createDebouncedCallback,
  createThrottledCallback,
  collectFeedContentRoots,
  observeMutations,
  observeVisibleElements,
} from '@/features/dom/observers';
import { TextNodeRegistry } from '@/features/dom/registry';
import {
  dedupeTextChunks,
  expandTranslations,
  getBatchPackOptions,
  packBatchesByBudget,
  pickFastFirstBatch,
  shouldTranslateText,
} from '@/features/translate/batch';
import { InPageTranslator } from '@/features/translate/in-page-translate';
import { isSameTranslationLanguage } from '@/features/translate/language-match';
import { StageTimer } from '@/features/translate/stage-timer';
import {
  ensureDocumentTitleTextNode,
  restoreDocumentTitle,
} from '@/features/translate/tab-title';
import type { TabStatus, TextChunk } from '@/features/translate/types';
import { resolveElementLang } from '@/features/opencc/locale';
import {
  FLUSH_COALESCE_MS,
  INTERSECTION_ROOT_MARGIN,
  MIN_TRANSLATE_TEXT_LENGTH,
  QUEUE_VISIBLE_DEBOUNCE_MS,
  TRANSLATE_BATCH_FAILURE_DELAY_MS,
  TRANSLATE_CONCURRENCY,
  TRANSLATE_FAST_LANE_BATCH_SIZE,
  TRANSLATE_FAST_LANE_MAX_CHARS,
} from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';
import {
  DEFAULT_TRANSLATION_MODE,
  type TranslationMode,
} from '@/shared/translation-mode';

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
  private translationMode: TranslationMode = DEFAULT_TRANSLATION_MODE;
  private isListingFeed = false;
  private scopeFilter: ContentScopeFilter | null = null;
  private pendingScopeRoots: Element[] = [];
  private initialCollectDone = false;
  private bulkInitialPackPending = true;
  private contentRoot: Element | null = null;
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private titleObserver: MutationObserver | null = null;
  private pendingNodes = new Set<Text>();
  private batchQueue: QueuedBatch[] = [];
  private inFlightCount = 0;
  private fastLaneDone = false;
  private draining = false;
  private batchRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private titleOriginal: string | null = null;
  private lastTitleTranslation: string | null = null;
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
  private readonly scheduleScrollCollect = createThrottledCallback(
    () => {
      this.queueVisibleCandidates();
    },
    QUEUE_VISIBLE_DEBOUNCE_MS,
  );
  private scrollResizeBound = false;

  getStatus(): TabStatus {
    const cache = this.inPageTranslator?.getCacheStats();
    return {
      active: this.active,
      error: this.error,
      translatedCount: this.registry.translatedCount(),
      cacheHits: cache?.hits ?? 0,
      cacheLookups: cache?.lookups ?? 0,
      timing: this.timing.getSummary(),
    };
  }

  async start(
    targetLang: string,
    settings: ExtensionSettings,
  ): Promise<TabStatus> {
    const pageLang = resolveElementLang(document.documentElement);
    if (isSameTranslationLanguage(pageLang, targetLang)) {
      return this.getStatus();
    }

    this.timing.reset();
    this.targetLang = targetLang;
    this.concurrency = TRANSLATE_CONCURRENCY;
    this.translationMode = settings.translationMode;
    this.initialCollectDone = false;
    this.bulkInitialPackPending = true;
    this.inPageTranslator = new InPageTranslator(settings, targetLang, this.timing, pageLang);
    this.inPageTranslator.warmProvider();
    this.batchQueue = [];
    this.inFlightCount = 0;
    this.fastLaneDone = false;
    this.error = null;
    this.titleOriginal = null;
    this.lastTitleTranslation = null;
    this.active = true;
    this.contentRoot = findCollectionRoot(document);
    this.isListingFeed = isLikelyListingFeed(document, document.location?.href ?? '');
    this.scopeFilter = createContentScopeFilter(document, this.isListingFeed);
    this.pendingScopeRoots = [];
    this.ensureObservers();
    this.bindScrollResize();
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
    this.scheduleScrollCollect.cancel();
    this.unbindScrollResize();
    this.teardownObservers();
    this.registry.restoreAll();
    this.registry.clear();
    if (this.titleOriginal !== null) {
      restoreDocumentTitle(this.titleOriginal);
    }
    this.titleOriginal = null;
    this.lastTitleTranslation = null;
    this.contentRoot = null;
    this.scopeFilter = null;
    this.pendingScopeRoots = [];
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
    if (!this.contentRoot) {
      return;
    }

    if (!this.mutationObserver) {
      this.mutationObserver = observeMutations(this.contentRoot, (records) => {
        if (!this.active) {
          return;
        }
        if (this.isListingFeed) {
          this.queueScopeRoots(collectFeedContentRoots(records));
        }
        this.scheduleQueueVisible();
      });
    }

    this.ensureTitleObserver();
  }

  private queueScopeRoots(added: Element[]): void {
    for (const root of added) {
      if (this.pendingScopeRoots.some((pending) => pending.contains(root))) {
        continue;
      }
      this.pendingScopeRoots = this.pendingScopeRoots.filter((pending) => !root.contains(pending));
      this.pendingScopeRoots.push(root);
    }
  }

  private ensureTitleObserver(): void {
    if (this.titleObserver) {
      return;
    }
    const titleNode = ensureDocumentTitleTextNode(document);
    const titleEl = titleNode?.parentElement;
    if (!titleEl) {
      return;
    }
    this.titleObserver = new MutationObserver(() => {
      if (!this.active) {
        return;
      }
      this.queueDocumentTitle();
    });
    this.titleObserver.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  private bindScrollResize(): void {
    if (this.scrollResizeBound) {
      return;
    }
    this.scrollResizeBound = true;
    window.addEventListener('scroll', this.scheduleScrollCollect, { passive: true });
    window.addEventListener('resize', this.scheduleScrollCollect, { passive: true });
  }

  private unbindScrollResize(): void {
    if (!this.scrollResizeBound) {
      return;
    }
    this.scrollResizeBound = false;
    window.removeEventListener('scroll', this.scheduleScrollCollect);
    window.removeEventListener('resize', this.scheduleScrollCollect);
  }

  private teardownObservers(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.titleObserver?.disconnect();
    this.titleObserver = null;
  }

  private enqueueNode(node: Text): void {
    if (!this.registry.hasNode(node)) {
      this.pendingNodes.add(node);
    }
  }

  private requestFlush(): void {
    this.scheduleFlush();
  }

  private queueDocumentTitle(): void {
    const node = ensureDocumentTitleTextNode(document);
    if (!node) {
      return;
    }
    const text = node.textContent ?? '';
    if (!shouldTranslateText(text, MIN_TRANSLATE_TEXT_LENGTH)) {
      return;
    }
    if (text === this.lastTitleTranslation) {
      return;
    }
    if (this.pendingNodes.has(node)) {
      return;
    }
    if (this.registry.hasNode(node) && text === this.titleOriginal) {
      return;
    }

    if (this.registry.hasNode(node)) {
      this.registry.releaseNode(node);
    }

    this.titleOriginal = text;
    this.lastTitleTranslation = null;
    this.enqueueNode(node);
    this.requestFlush();
  }

  private queueVisibleCandidates(): void {
    const root = this.getRoot();
    const deferredParents = new Set<Element>();
    const useViewport = this.shouldCollectNearViewport();
    // Listing scopes are built once and extended with appended feed items.
    // Rescanning the whole feed here would make every scroll cost grow with
    // the amount of content already loaded.
    if (!this.scopeFilter) {
      this.scopeFilter = createContentScopeFilter(document, this.isListingFeed);
    } else if (this.pendingScopeRoots.length > 0) {
      this.scopeFilter.addRoots?.(this.pendingScopeRoots);
      this.pendingScopeRoots = [];
    }
    const scopeFilter: ContentScopeFilter = this.scopeFilter;

    this.timing.start('collect_dom');
    const collected = collectTextNodes(root, {
      ...(useViewport
        ? {
          viewportMarginPx: VIEWPORT_MARGIN_PX,
          onDeferSubtree: (element: Element) => {
            deferredParents.add(element);
          },
        }
        : {}),
      isInScope: scopeFilter,
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

    this.queueDocumentTitle();
    if (enqueued || this.pendingNodes.size > 0) {
      this.requestFlush();
    }

    if (!this.initialCollectDone) {
      this.initialCollectDone = true;
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
      const visible = collectTextNodes(element, {
        viewportMarginPx: VIEWPORT_MARGIN_PX,
        isInScope: this.scopeFilter ?? undefined,
      });
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

  private shouldCollectNearViewport(): boolean {
    if (!this.initialCollectDone) {
      // The first pass follows the mode: bulk translates the whole page,
      // progressive starts with what is close to the viewport (except listing
      // feeds, whose items are part of the loaded page).
      return this.translationMode === 'progressive' && !this.isListingFeed;
    }
    // Later passes are scroll-triggered, so scan only the viewport band.
    return true;
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
      const sourceLang = resolveElementLang(node.parentElement);
      chunks.push(sourceLang ? { id, text: original, sourceLang } : { id, text: original });
    }
    this.timing.end('build_chunks');
    return chunks;
  }

  private enqueueBatches(unique: TextChunk[], expand: Map<string, string[]>): void {
    let rest = unique;
    const incremental = this.translationMode === 'bulk' && !this.bulkInitialPackPending;
    const pack = getBatchPackOptions(this.translationMode, { incremental });
    const useFastLaneNow = pack.useFastLane && (incremental || !this.fastLaneDone);

    if (useFastLaneNow) {
      if (!incremental) {
        this.fastLaneDone = true;
      }
      const { fast, rest: remaining } = pickFastFirstBatch(
        unique,
        TRANSLATE_FAST_LANE_BATCH_SIZE,
        TRANSLATE_FAST_LANE_MAX_CHARS,
      );
      rest = remaining;
      if (fast.length > 0) {
        this.batchQueue.unshift({ batch: fast, expand });
      }
    } else if (!pack.useFastLane) {
      this.fastLaneDone = true;
    }

    const batches = packBatchesByBudget(rest, pack.maxItems, pack.maxChars);
    for (const batch of batches) {
      this.batchQueue.push({ batch, expand });
    }

    if (this.translationMode === 'bulk' && this.bulkInitialPackPending) {
      this.bulkInitialPackPending = false;
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

    const waitingForFirstPaint = this.timing.getSummary().firstVisibleMs === null;
    const workerLimit = waitingForFirstPaint ? 1 : this.concurrency;

    while (this.inFlightCount < workerLimit) {
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

  private applyTranslations(
    translations: TextChunk[],
    expand: Map<string, string[]>,
    applied: Set<string>,
  ): void {
    this.timing.start('apply_dom');
    const expanded = expandTranslations(translations, expand);
    const titleNode = ensureDocumentTitleTextNode(document);
    for (const item of expanded) {
      if (applied.has(item.id)) {
        continue;
      }
      const record = this.registry.get(item.id);
      if (this.registry.applyTranslation(item.id, item.text)) {
        applied.add(item.id);
        this.timing.markFirstVisible();
        if (titleNode && record?.node === titleNode) {
          this.lastTitleTranslation = item.text;
        }
      }
    }
    this.timing.end('apply_dom');
  }

  private async translateAndApply(
    batch: TextChunk[],
    expand: Map<string, string[]>,
  ): Promise<void> {
    if (!this.inPageTranslator) {
      return;
    }

    const applied = new Set<string>();
    const apply = (translations: TextChunk[]) => {
      this.applyTranslations(translations, expand, applied);
    };

    const result = await this.inPageTranslator.translate(batch, apply);
    apply(result.translations);
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
