const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const SLASH_DATE_PATTERN = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;
const MONTH_DATE_PATTERN = /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4}$/i;
const RELATIVE_TIME_PATTERN = /^\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago$/i;

export function normalizeCacheText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isLikelyDateText(text: string): boolean {
  const trimmed = normalizeCacheText(text);
  if (!trimmed) {
    return false;
  }
  return (
    ISO_DATE_PATTERN.test(trimmed)
    || SLASH_DATE_PATTERN.test(trimmed)
    || MONTH_DATE_PATTERN.test(trimmed)
    || RELATIVE_TIME_PATTERN.test(trimmed)
  );
}
