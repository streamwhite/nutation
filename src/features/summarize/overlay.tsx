import { type LucideIcon, Check, Copy, LayoutPanelTop, Minus, PanelLeft, PanelRight, Plus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IntlProvider, useIntl } from 'react-intl';
import summaryStyles from '@/assets/globals.css?inline';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_LOCALE,
  getMessages,
  resolveUiLocale,
  type Locale,
  type LocaleSetting,
  type MessageId,
} from '@/i18n';
import {
  SUMMARIZE_OVERLAY_ROOT_ID,
  SUMMARIZE_PREFS_STORAGE_KEY,
} from '@/shared/constants';
import { loadSettings, saveSettings } from '@/shared/settings';
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
  uiLocale?: LocaleSetting;
};

const POSITION_CLASSES: Record<SummaryPosition, string> = {
  right: 'justify-end',
  center: 'justify-center',
  left: 'justify-start',
};

const POSITION_PANEL_WIDTHS: Record<SummaryPosition, string> = {
  right: 'max-w-[440px]',
  center: 'max-w-[760px]',
  left: 'max-w-[440px]',
};

const POSITION_ICONS: Record<SummaryPosition, LucideIcon> = {
  right: PanelRight,
  center: LayoutPanelTop,
  left: PanelLeft,
};

const DEFAULT_ICON_SIZE = 16;
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

function saveSummaryPrefs(
  prefs: SummaryPrefs,
  storage: Storage | null = globalThis.localStorage,
): void {
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

function nextPosition(position: SummaryPosition): SummaryPosition {
  const index = SUMMARY_POSITIONS.indexOf(position);
  return SUMMARY_POSITIONS[(index + 1) % SUMMARY_POSITIONS.length];
}

type SummaryOverlayProps = {
  summary: string;
  isListingFeed: boolean;
  fromCache: boolean;
  initialPosition: SummaryPosition;
  initialFontSizePx: number;
  onClose: () => void;
};

function IconAction({
  label,
  icon: Icon,
  onClick,
  pressed,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon size={DEFAULT_ICON_SIZE} />
    </Button>
  );
}

export function SummaryOverlay({
  summary,
  isListingFeed,
  fromCache,
  initialPosition,
  initialFontSizePx,
  onClose,
}: SummaryOverlayProps) {
  const intl = useIntl();
  const [position, setPosition] = useState(initialPosition);
  const [fontSizePx, setFontSizePx] = useState(initialFontSizePx);
  const [copied, setCopied] = useState(false);

  const t = (id: MessageId) => intl.formatMessage({ id });

  const cyclePosition = () => {
    const next = nextPosition(position);
    setPosition(next);
    void persistSummaryPosition(next);
  };

  const changeFontSize = (delta: number) => {
    const next = Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, fontSizePx + delta));
    setFontSizePx(next);
    saveSummaryPrefs({ fontSizePx: next });
  };

  const copySummary = () => {
    void navigator.clipboard.writeText(summary).then(() => setCopied(true)).catch(() => undefined);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const PositionIcon = POSITION_ICONS[position];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('overlay.title')}
      className={`flex h-full w-full items-stretch bg-black/40 font-sans ${POSITION_CLASSES[position]}`}
      onClick={onClose}
    >
      <div
        className={`flex h-full w-full flex-col bg-card text-card-foreground shadow-2xl ${POSITION_PANEL_WIDTHS[position]}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="text-base font-semibold">{t('overlay.title')}</h2>
          <div className="flex items-center gap-1">
            <IconAction
              label={copied ? t('overlay.copied') : t('overlay.copy')}
              icon={copied ? Check : Copy}
              onClick={copySummary}
              pressed={copied}
            />
            <IconAction
              label={t('overlay.positionLabel')}
              icon={PositionIcon}
              onClick={cyclePosition}
            />
            <IconAction
              label={t('overlay.fontSmaller')}
              icon={Minus}
              onClick={() => changeFontSize(-FONT_STEP_PX)}
            />
            <IconAction
              label={t('overlay.fontLarger')}
              icon={Plus}
              onClick={() => changeFontSize(FONT_STEP_PX)}
            />
            <IconAction label={t('overlay.close')} icon={X} onClick={onClose} />
          </div>
        </header>

        {fromCache && (
          <p className="border-b bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
            {t('overlay.cacheNotice')}
          </p>
        )}

        {isListingFeed && (
          <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-800">
            {t('overlay.listingWarning')}
          </p>
        )}

        <div className="flex-1 overflow-auto px-4 py-4" style={{ fontSize: `${fontSizePx}px` }}>
          {formatSummaryParagraphs(summary).map((paragraph, index) => (
            <p key={index} className="mb-3 leading-relaxed whitespace-pre-wrap last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

let activeRoot: Root | null = null;

function removeExistingOverlay(doc: Document): void {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
  }
  doc.getElementById(SUMMARIZE_OVERLAY_ROOT_ID)?.remove();
}

export function showSummaryOverlay(
  options: SummaryOverlayOptions,
  doc: Document = document,
): HTMLElement {
  removeExistingOverlay(doc);

  const locale: Locale = resolveUiLocale(options.uiLocale);
  const prefs = loadSummaryPrefs();
  const position = resolveSummaryPosition(options.position ?? DEFAULT_SUMMARY_POSITION);

  const host = doc.createElement('div');
  host.id = SUMMARIZE_OVERLAY_ROOT_ID;
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    display: 'block',
  });

  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = summaryStyles;
  const mount = doc.createElement('div');
  mount.className = 'theme-root h-full w-full';
  shadow.append(style, mount);

  const root = createRoot(mount);
  activeRoot = root;
  root.render(
    <IntlProvider
      locale={locale}
      defaultLocale={DEFAULT_LOCALE}
      messages={getMessages(locale)}
      onError={() => undefined}
    >
      <SummaryOverlay
        summary={options.summary}
        isListingFeed={options.isListingFeed}
        fromCache={Boolean(options.fromCache)}
        initialPosition={position}
        initialFontSizePx={prefs.fontSizePx}
        onClose={() => {
          root.unmount();
          if (activeRoot === root) {
            activeRoot = null;
          }
          host.remove();
        }}
      />
    </IntlProvider>,
  );

  doc.documentElement.append(host);
  return host;
}
