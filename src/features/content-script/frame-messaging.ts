import { browser } from 'wxt/browser';
import type { ContentScriptMessage, TabStatus } from '@/features/translate/types';
import type { StageTimingSummary } from '@/features/translate/stage-timer';

async function listFrameIds(tabId: number): Promise<number[]> {
  const frames = await browser.webNavigation.getAllFrames({ tabId }) ?? [];
  const frameIds = frames.map((frame) => frame.frameId);
  return frameIds.length > 0 ? frameIds : [0];
}

export async function sendMessageToAllFrames<T>(
  tabId: number,
  message: ContentScriptMessage,
): Promise<T[]> {
  const frameIds = await listFrameIds(tabId);
  const results: T[] = [];

  for (const frameId of frameIds) {
    try {
      const result = await browser.tabs.sendMessage(tabId, message, { frameId });
      results.push(result as T);
    } catch {
      // Frame may be restricted or not have a content script yet.
    }
  }

  if (results.length === 0) {
    throw new Error('No content script frames responded');
  }

  return results;
}

function mergeStageTiming(
  left: StageTimingSummary | undefined,
  right: StageTimingSummary | undefined,
): StageTimingSummary | undefined {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  const stages = { ...left.stages };
  for (const [name, stats] of Object.entries(right.stages)) {
    const existing = stages[name];
    if (!existing) {
      stages[name] = { ...stats };
      continue;
    }
    const count = existing.count + stats.count;
    stages[name] = {
      count,
      totalMs: existing.totalMs + stats.totalMs,
      avgMs: count > 0 ? Math.round((existing.totalMs + stats.totalMs) / count) : 0,
      maxMs: Math.max(existing.maxMs, stats.maxMs),
    };
  }

  return {
    elapsedMs: Math.max(left.elapsedMs, right.elapsedMs),
    firstVisibleMs: minDefinedTiming(left.firstVisibleMs, right.firstVisibleMs),
    stages,
  };
}

function minDefinedTiming(left: number | null, right: number | null): number | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return Math.min(left, right);
}

export function mergeTabStatuses(statuses: TabStatus[]): TabStatus {
  let merged: TabStatus = {
    active: false,
    error: null,
    translatedCount: 0,
    cacheHits: 0,
    cacheLookups: 0,
  };

  for (const status of statuses) {
    merged = {
      active: merged.active || status.active,
      error: merged.error ?? status.error,
      translatedCount: merged.translatedCount + status.translatedCount,
      cacheHits: (merged.cacheHits ?? 0) + (status.cacheHits ?? 0),
      cacheLookups: (merged.cacheLookups ?? 0) + (status.cacheLookups ?? 0),
      timing: mergeStageTiming(merged.timing, status.timing),
    };
  }

  return merged;
}
