import { describe, expect, it } from 'vitest';
import {
  createEmptyTranslateOnOpenRule,
  readTranslateOnOpenRulesFromRoot,
  renderTranslateOnOpenRuleRow,
} from '@/features/options/translate-on-open-ui';

describe('translate-on-open options ui helpers', () => {
  it('reads enabled rules with patterns from the DOM', () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const rule = createEmptyTranslateOnOpenRule();
    rule.type = 'domain';
    rule.pattern = 'example.com';
    root.append(renderTranslateOnOpenRuleRow(rule, () => undefined));

    expect(readTranslateOnOpenRulesFromRoot(root)).toEqual([
      expect.objectContaining({
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
      }),
    ]);
  });
});
