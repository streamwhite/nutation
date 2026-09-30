import type { MessageId } from '@/i18n';

export const TRANSLATE_ON_OPEN_MATCH_TYPES = ['prefix', 'domain', 'regexp'] as const;

export type TranslateOnOpenMatchType = (typeof TRANSLATE_ON_OPEN_MATCH_TYPES)[number];

export type TranslateOnOpenRule = {
  id: string;
  type: TranslateOnOpenMatchType;
  pattern: string;
  enabled: boolean;
};

export const TRANSLATE_ON_OPEN_MATCH_LABEL_IDS: Record<TranslateOnOpenMatchType, MessageId> = {
  prefix: 'options.translateOnOpen.match.prefix',
  domain: 'options.translateOnOpen.match.domain',
  regexp: 'options.translateOnOpen.match.regexp',
};

export const TRANSLATE_ON_OPEN_MATCH_PLACEHOLDER_IDS: Record<
  TranslateOnOpenMatchType,
  MessageId
> = {
  prefix: 'options.translateOnOpen.placeholder.prefix',
  domain: 'options.translateOnOpen.placeholder.domain',
  regexp: 'options.translateOnOpen.placeholder.regexp',
};

export function isTranslateOnOpenMatchType(value: unknown): value is TranslateOnOpenMatchType {
  return typeof value === 'string'
    && TRANSLATE_ON_OPEN_MATCH_TYPES.includes(value as TranslateOnOpenMatchType);
}

function normalizePattern(pattern: string): string {
  return pattern.trim();
}

function hostnameFromValue(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesDomain(pageHost: string, domainHost: string): boolean {
  return pageHost === domainHost || pageHost.endsWith(`.${domainHost}`);
}

export function matchTranslateOnOpenRule(
  url: string,
  rule: TranslateOnOpenRule,
): boolean {
  if (!rule.enabled) {
    return false;
  }
  const pattern = normalizePattern(rule.pattern);
  if (!pattern) {
    return false;
  }

  if (rule.type === 'prefix') {
    return url.startsWith(pattern);
  }

  if (rule.type === 'domain') {
    let pageHost: string;
    try {
      pageHost = new URL(url).hostname.toLowerCase();
    } catch {
      return false;
    }
    const domainHost = hostnameFromValue(pattern);
    if (!domainHost) {
      return false;
    }
    return hostMatchesDomain(pageHost, domainHost);
  }

  try {
    return new RegExp(pattern).test(url);
  } catch {
    return false;
  }
}

export function shouldTranslateOnOpen(
  url: string,
  options: {
    translateOnOpen: boolean;
    rules: TranslateOnOpenRule[];
  },
): boolean {
  if (!options.translateOnOpen || options.rules.length === 0) {
    return false;
  }
  return options.rules.some((rule) => matchTranslateOnOpenRule(url, rule));
}

export function createTranslateOnOpenRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyTranslateOnOpenRule(): TranslateOnOpenRule {
  return {
    id: createTranslateOnOpenRuleId(),
    type: 'domain',
    pattern: '',
    enabled: true,
  };
}

export function parseTranslateOnOpenRules(raw: unknown): TranslateOnOpenRule[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const rules: TranslateOnOpenRule[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const value = entry as Partial<TranslateOnOpenRule>;
    if (!isTranslateOnOpenMatchType(value.type)) {
      continue;
    }
    const pattern = typeof value.pattern === 'string' ? normalizePattern(value.pattern) : '';
    if (!pattern) {
      continue;
    }
    rules.push({
      id: typeof value.id === 'string' && value.id.trim()
        ? value.id.trim()
        : createTranslateOnOpenRuleId(),
      type: value.type,
      pattern,
      enabled: value.enabled !== false,
    });
  }
  return rules;
}
