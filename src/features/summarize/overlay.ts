import {
  SUMMARIZE_OVERLAY_ROOT_ID,
  SUMMARIZE_PREFS_STORAGE_KEY,
} from '@/shared/constants';
import { loadSettings, saveSettings } from '@/shared/settings';
import { getUiStrings } from '@/shared/ui-strings';
import {
  DEFAULT_SUMMARY_POSITION,
  SUMMARY_POSITIONS,
  resolveSummaryPosition,
  type SummaryPosition,
} from '@/features/summarize/summary-position';

export type { SummaryPosition };

export type SummaryOverlayOptions = {
  summary: string;
  isListingFeed: boolean;
  fromCache?: boolean;
  position?: SummaryPosition;
};

const POSITION_SYMBOLS: Record<SummaryPosition, string> = {
  right: '◨',
  center: '◫',
  left: '◧',
};

const BASE_FONT_PX = 16;
const FONT_STEP_PX = 2;
const MIN_FONT_PX = 12;
const MAX_FONT_PX = 28;

type SummaryPrefs = { fontSizePx: number };

export function resolveSummaryFontPx(
  envValue: string | undefined,
  fallback = BASE_FONT_PX,
): number {
  const parsed = Number(envValue);
  if (!envValue?.trim() || !Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, Math.round(parsed)));
}

const DEFAULT_PREFS: SummaryPrefs = {
  fontSizePx: resolveSummaryFontPx(import.meta.env.VITE_DEFAULT_SUMMARY_FONT_PX),
};

function loadSummaryPrefs(storage: Storage | null = globalThis.localStorage): SummaryPrefs {
  if (!storage) {
    return DEFAULT_PREFS;
  }
  try {
    const raw = storage.getItem(SUMMARIZE_PREFS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<SummaryPrefs>;
    const fontSizePx = Number(parsed.fontSizePx);
    return {
      fontSizePx: Number.isFinite(fontSizePx)
        ? Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, fontSizePx))
        : DEFAULT_PREFS.fontSizePx,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function saveSummaryPrefs(prefs: SummaryPrefs, storage: Storage | null = globalThis.localStorage): void {
  try {
    storage?.setItem(SUMMARIZE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures (quota, privacy mode).
  }
}

async function persistSummaryPosition(position: SummaryPosition): Promise<void> {
  try {
    const current = await loadSettings();
    await saveSettings({ ...current, summaryPosition: position });
  } catch (error) {
    console.error('Failed to save summary position.', error);
  }
}

export function formatSummaryParagraphs(summary: string): string[] {
  const trimmed = summary.trim();
  if (!trimmed) {
    return [];
  }
  const parts = trimmed.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
}

function removeExistingOverlay(doc: Document): void {
  doc.getElementById(SUMMARIZE_OVERLAY_ROOT_ID)?.remove();
}

function createStyles(): string {
  return `
#${SUMMARIZE_OVERLAY_ROOT_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 32, 0.42);
  font-family: Georgia, "Times New Roman", serif;
}
#${SUMMARIZE_OVERLAY_ROOT_ID}.pts-pos-right {
  justify-content: flex-end;
}
#${SUMMARIZE_OVERLAY_ROOT_ID}.pts-pos-left {
  justify-content: flex-start;
}
#${SUMMARIZE_OVERLAY_ROOT_ID}.pts-pos-center {
  justify-content: center;
}
#${SUMMARIZE_OVERLAY_ROOT_ID}.pts-pos-center .pts-panel {
  width: min(720px, 100%);
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.18);
}
#${SUMMARIZE_OVERLAY_ROOT_ID} * {
  box-sizing: border-box;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-panel {
  width: min(420px, 100%);
  height: 100%;
  background: #f7f4ef;
  color: #1c1917;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(28, 25, 23, 0.12);
  background: #efe9e0;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-actions {
  display: flex;
  gap: 8px;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} button {
  border: 1px solid rgba(28, 25, 23, 0.2);
  background: #fff;
  color: #1c1917;
  border-radius: 8px;
  padding: 6px 10px;
  font: 13px/1.2 system-ui, sans-serif;
  cursor: pointer;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} button:hover {
  background: #f5f5f4;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-warning {
  margin: 0;
  padding: 10px 18px;
  background: #fff7ed;
  color: #9a3412;
  font: 13px/1.4 system-ui, sans-serif;
  border-bottom: 1px solid rgba(154, 52, 18, 0.15);
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-cache {
  margin: 0;
  padding: 10px 18px;
  background: #ecfdf5;
  color: #065f46;
  font: 13px/1.4 system-ui, sans-serif;
  border-bottom: 1px solid rgba(6, 95, 70, 0.12);
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-body {
  overflow: auto;
  padding: 18px;
  flex: 1;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-body p {
  margin: 0 0 14px;
  font-size: 1em;
  line-height: 1.55;
  white-space: pre-wrap;
}
#${SUMMARIZE_OVERLAY_ROOT_ID} .pts-body p:last-child {
  margin-bottom: 0;
}
`;
}

export function showSummaryOverlay(
  options: SummaryOverlayOptions,
  doc: Document = document,
): HTMLElement {
  removeExistingOverlay(doc);
  const copy = getUiStrings().summarize;
  const prefs = loadSummaryPrefs();
  let position = resolveSummaryPosition(options.position ?? DEFAULT_SUMMARY_POSITION);
  const root = doc.createElement('div');
  root.id = SUMMARIZE_OVERLAY_ROOT_ID;
  root.classList.add(`pts-pos-${position}`);
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', copy.overlayTitle);

  const style = doc.createElement('style');
  style.textContent = createStyles();

  const panel = doc.createElement('aside');
  panel.className = 'pts-panel';

  const header = doc.createElement('div');
  header.className = 'pts-header';

  const title = doc.createElement('h2');
  title.className = 'pts-title';
  title.textContent = copy.overlayTitle;

  const actions = doc.createElement('div');
  actions.className = 'pts-actions';

  const copyBtn = doc.createElement('button');
  copyBtn.type = 'button';
  copyBtn.textContent = copy.copyLabel;

  const positionBtn = doc.createElement('button');
  positionBtn.type = 'button';
  positionBtn.dataset.role = 'position';
  positionBtn.setAttribute('aria-label', copy.positionLabel);
  positionBtn.textContent = POSITION_SYMBOLS[position];

  const smallerBtn = doc.createElement('button');
  smallerBtn.type = 'button';
  smallerBtn.dataset.role = 'font-smaller';
  smallerBtn.setAttribute('aria-label', copy.fontSmallerLabel);
  smallerBtn.textContent = 'A−';

  const largerBtn = doc.createElement('button');
  largerBtn.type = 'button';
  largerBtn.dataset.role = 'font-larger';
  largerBtn.setAttribute('aria-label', copy.fontLargerLabel);
  largerBtn.textContent = 'A+';

  const closeBtn = doc.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = copy.closeLabel;

  const body = doc.createElement('div');
  body.className = 'pts-body';
  body.style.fontSize = `${prefs.fontSizePx}px`;
  for (const paragraph of formatSummaryParagraphs(options.summary)) {
    const p = doc.createElement('p');
    p.textContent = paragraph;
    body.append(p);
  }

  const close = () => {
    doc.removeEventListener('keydown', onKeyDown);
    root.remove();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  copyBtn.addEventListener('click', () => {
    void navigator.clipboard.writeText(options.summary).then(() => {
      copyBtn.textContent = copy.copiedLabel;
    }).catch(() => undefined);
  });
  positionBtn.addEventListener('click', () => {
    const currentIndex = SUMMARY_POSITIONS.indexOf(position);
    const next = SUMMARY_POSITIONS[(currentIndex + 1) % SUMMARY_POSITIONS.length];
    root.classList.remove(...SUMMARY_POSITIONS.map((p) => `pts-pos-${p}`));
    root.classList.add(`pts-pos-${next}`);
    position = next;
    positionBtn.textContent = POSITION_SYMBOLS[next];
    void persistSummaryPosition(next);
  });
  const setFontSize = (delta: number) => {
    prefs.fontSizePx = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, prefs.fontSizePx + delta));
    body.style.fontSize = `${prefs.fontSizePx}px`;
    saveSummaryPrefs(prefs);
  };
  smallerBtn.addEventListener('click', () => setFontSize(-FONT_STEP_PX));
  largerBtn.addEventListener('click', () => setFontSize(FONT_STEP_PX));
  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) {
      close();
    }
  });
  doc.addEventListener('keydown', onKeyDown);

  actions.append(copyBtn, positionBtn, smallerBtn, largerBtn, closeBtn);
  header.append(title, actions);
  panel.append(header);

  if (options.fromCache) {
    const cacheNotice = doc.createElement('p');
    cacheNotice.className = 'pts-cache';
    cacheNotice.textContent = copy.cacheNotice;
    panel.append(cacheNotice);
  }

  if (options.isListingFeed) {
    const warning = doc.createElement('p');
    warning.className = 'pts-warning';
    warning.textContent = copy.listingWarning;
    panel.append(warning);
  }

  panel.append(body);
  root.append(style, panel);
  doc.documentElement.append(root);
  closeBtn.focus();
  return root;
}
