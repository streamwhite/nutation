import { Plus, Trash2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useFlash } from '@/features/options/use-flash';
import {
  createEmptyTranslateOnOpenRule,
  parseTranslateOnOpenRules,
  TRANSLATE_ON_OPEN_MATCH_LABEL_IDS,
  TRANSLATE_ON_OPEN_MATCH_PLACEHOLDER_IDS,
  TRANSLATE_ON_OPEN_MATCH_TYPES,
  type TranslateOnOpenMatchType,
  type TranslateOnOpenRule,
} from '@/features/translate-on-open/match';
import type { ExtensionSettings } from '@/shared/settings';

type TranslateOnOpenSectionProps = {
  settings: ExtensionSettings;
  onSave: (patch: Partial<ExtensionSettings>) => Promise<ExtensionSettings>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TranslateOnOpenSection({
  settings,
  onSave,
}: TranslateOnOpenSectionProps) {
  const intl = useIntl();
  const [enabled, setEnabled] = useState(settings.translateOnOpen);
  const [rules, setRules] = useState<TranslateOnOpenRule[]>(settings.translateOnOpenRules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, showSaved] = useFlash();

  useEffect(() => {
    setEnabled(settings.translateOnOpen);
    setRules(settings.translateOnOpenRules);
  }, [settings]);

  const patchRule = (id: string, patch: Partial<TranslateOnOpenRule>) => {
    setRules((current) => current.map((rule) => (
      rule.id === id ? { ...rule, ...patch } : rule
    )));
  };

  const removeRule = (id: string) => {
    setRules((current) => current.filter((rule) => rule.id !== id));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const sanitized = parseTranslateOnOpenRules(rules);
      const saved = await onSave({
        translateOnOpen: enabled,
        translateOnOpenRules: sanitized,
      });
      setEnabled(saved.translateOnOpen);
      setRules(saved.translateOnOpenRules);
      showSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.formatMessage({ id: 'options.translateOnOpen.title' })}
        </CardTitle>
        <CardDescription>
          {intl.formatMessage({ id: 'options.translateOnOpen.enable' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="translate-on-open"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
          />
          <Label htmlFor="translate-on-open" className="font-normal">
            {intl.formatMessage({ id: 'options.translateOnOpen.enable' })}
          </Label>
        </div>

        {rules.map((rule) => (
          <div key={rule.id} className="grid gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={rule.enabled}
                aria-label={intl.formatMessage({ id: 'options.translateOnOpen.enabled' })}
                onCheckedChange={(checked) => patchRule(rule.id, { enabled: checked === true })}
              />
              <Select
                value={rule.type}
                onValueChange={(value) => patchRule(rule.id, {
                  type: value as TranslateOnOpenMatchType,
                })}
              >
                <SelectTrigger className="h-8 w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATE_ON_OPEN_MATCH_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {intl.formatMessage({ id: TRANSLATE_ON_OPEN_MATCH_LABEL_IDS[type] })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 />
                {intl.formatMessage({ id: 'options.translateOnOpen.remove' })}
              </Button>
            </div>
            <Input
              value={rule.pattern}
              spellCheck={false}
              autoComplete="off"
              placeholder={intl.formatMessage({
                id: TRANSLATE_ON_OPEN_MATCH_PLACEHOLDER_IDS[rule.type],
              })}
              onChange={(event) => patchRule(rule.id, { pattern: event.target.value })}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRules((current) => [...current, createEmptyTranslateOnOpenRule()])}
          >
            <Plus />
            {intl.formatMessage({ id: 'options.translateOnOpen.addRule' })}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Spinner />}
            {intl.formatMessage({ id: 'options.translateOnOpen.save' })}
          </Button>
          {saved && (
            <Alert variant="success" className="w-auto py-1.5">
              {intl.formatMessage({ id: 'options.translateOnOpen.saved' })}
            </Alert>
          )}
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}
      </CardContent>
    </Card>
  );
}
