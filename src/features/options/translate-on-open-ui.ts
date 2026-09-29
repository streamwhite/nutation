import {
  createTranslateOnOpenRuleId,
  TRANSLATE_ON_OPEN_MATCH_LABELS,
  TRANSLATE_ON_OPEN_MATCH_TYPES,
  type TranslateOnOpenMatchType,
  type TranslateOnOpenRule,
} from '@/features/translate-on-open/match';

export function createEmptyTranslateOnOpenRule(): TranslateOnOpenRule {
  return {
    id: createTranslateOnOpenRuleId(),
    type: 'domain',
    pattern: '',
    enabled: true,
  };
}

export function readTranslateOnOpenRulesFromRoot(root: HTMLElement): TranslateOnOpenRule[] {
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-translate-on-open-rule]'));
  const rules: TranslateOnOpenRule[] = [];

  for (const row of rows) {
    const id = row.dataset.ruleId?.trim() || createTranslateOnOpenRuleId();
    const enabled = row.querySelector<HTMLInputElement>('[data-rule-enabled]')?.checked !== false;
    const typeValue = row.querySelector<HTMLSelectElement>('[data-rule-type]')?.value;
    const pattern = row.querySelector<HTMLInputElement>('[data-rule-pattern]')?.value.trim() ?? '';
    if (!pattern) {
      continue;
    }
    if (!TRANSLATE_ON_OPEN_MATCH_TYPES.includes(typeValue as TranslateOnOpenMatchType)) {
      continue;
    }
    rules.push({
      id,
      type: typeValue as TranslateOnOpenMatchType,
      pattern,
      enabled,
    });
  }

  return rules;
}

export function renderTranslateOnOpenRuleRow(
  rule: TranslateOnOpenRule,
  onRemove: (row: HTMLElement) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'border rounded p-2 mb-2';
  row.dataset.translateOnOpenRule = '1';
  row.dataset.ruleId = rule.id;

  const top = document.createElement('div');
  top.className = 'd-flex gap-2 align-items-center mb-2';

  const enabledWrap = document.createElement('div');
  enabledWrap.className = 'form-check mb-0';
  const enabled = document.createElement('input');
  enabled.type = 'checkbox';
  enabled.className = 'form-check-input';
  enabled.dataset.ruleEnabled = '1';
  enabled.checked = rule.enabled;
  enabled.title = 'Enabled';
  enabledWrap.append(enabled);

  const typeSelect = document.createElement('select');
  typeSelect.className = 'form-select form-select-sm';
  typeSelect.dataset.ruleType = '1';
  for (const type of TRANSLATE_ON_OPEN_MATCH_TYPES) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = TRANSLATE_ON_OPEN_MATCH_LABELS[type];
    option.selected = type === rule.type;
    typeSelect.append(option);
  }

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-outline-danger btn-sm ms-auto';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => onRemove(row));

  top.append(enabledWrap, typeSelect, removeBtn);

  const pattern = document.createElement('input');
  pattern.type = 'text';
  pattern.className = 'form-control form-control-sm';
  pattern.dataset.rulePattern = '1';
  pattern.value = rule.pattern;
  pattern.placeholder = rule.type === 'domain'
    ? 'example.com'
    : rule.type === 'prefix'
      ? 'https://example.com/docs'
      : '^https://example\\.com/.*';
  pattern.spellcheck = false;
  pattern.autocomplete = 'off';

  typeSelect.addEventListener('change', () => {
    const next = typeSelect.value as TranslateOnOpenMatchType;
    pattern.placeholder = next === 'domain'
      ? 'example.com'
      : next === 'prefix'
        ? 'https://example.com/docs'
        : '^https://example\\.com/.*';
  });

  row.append(top, pattern);
  return row;
}
