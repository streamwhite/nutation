import strings from '@/shared/ui-strings.json';

export type UiStrings = typeof strings;

export function getUiStrings(): UiStrings {
  return strings;
}
