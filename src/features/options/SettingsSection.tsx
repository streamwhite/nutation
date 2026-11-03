import { useIntl } from 'react-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { LOCALE_SETTINGS, type LocaleSetting, type MessageId } from '@/i18n';
import { LanguageCombobox } from '@/features/options/LanguageCombobox';
import { useFlash } from '@/features/options/use-flash';
import {
  SUMMARY_POSITION_LABEL_IDS,
  SUMMARY_POSITIONS,
  type SummaryPosition,
} from '@/features/summarize/summary-position';
import {
  getProviderPreset,
  isProviderAllowed,
  listProvidersByCategory,
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABEL_IDS,
  PROVIDER_LABEL_IDS,
  resolveProviderBaseUrl,
  type ProviderId,
} from '@/shared/providers';
import type { ExtensionSettings } from '@/shared/settings';
import {
  TRANSLATION_MODE_LABEL_IDS,
  TRANSLATION_MODE_NOTE_IDS,
  TRANSLATION_MODES,
  type TranslationMode,
} from '@/shared/translation-mode';

type Draft = {
  provider: ProviderId;
  allowChinaDataTransfer: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  targetLang: string;
  translationMode: TranslationMode;
  summaryPosition: SummaryPosition;
  autoRecoverContentScript: boolean;
  copyIncludeLink: boolean;
  copySeparator: string;
  uiLocale: LocaleSetting;
};

const UI_LOCALE_LABEL_IDS: Record<LocaleSetting, MessageId> = {
  auto: 'options.uiLanguage.auto',
  en: 'options.uiLanguage.en',
  'zh-CN': 'options.uiLanguage.zh-CN',
};

function draftFromSettings(settings: ExtensionSettings): Draft {
  return {
    provider: settings.provider,
    allowChinaDataTransfer: settings.allowChinaDataTransfer,
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    targetLang: settings.targetLang,
    translationMode: settings.translationMode,
    summaryPosition: settings.summaryPosition,
    autoRecoverContentScript: settings.autoRecoverContentScript,
    copyIncludeLink: settings.copyIncludeLink,
    copySeparator: settings.copySeparator,
    uiLocale: settings.uiLocale,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type SettingsSectionProps = {
  settings: ExtensionSettings;
  onSave: (patch: Partial<ExtensionSettings>) => Promise<ExtensionSettings>;
};

export function SettingsSection({ settings, onSave }: SettingsSectionProps) {
  const intl = useIntl();
  const [draft, setDraft] = useState<Draft>(() => draftFromSettings(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, showSaved] = useFlash();

  useEffect(() => {
    setDraft(draftFromSettings(settings));
  }, [settings]);

  const patchDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const onProviderChange = (next: ProviderId) => {
    if (!isProviderAllowed(next, draft.allowChinaDataTransfer)) {
      return;
    }
    if (next === 'custom') {
      patchDraft({ provider: next });
      return;
    }
    const preset = getProviderPreset(next);
    patchDraft({ provider: next, baseUrl: preset.baseUrl, model: preset.defaultModel });
  };

  const onAllowChinaDataTransferChange = (allowed: boolean) => {
    if (allowed) {
      patchDraft({ allowChinaDataTransfer: true });
      return;
    }
    if (draft.provider === 'deepseek') {
      const fallback = getProviderPreset('openai');
      patchDraft({
        allowChinaDataTransfer: false,
        provider: fallback.id,
        baseUrl: fallback.baseUrl,
        model: fallback.defaultModel,
      });
      return;
    }
    patchDraft({ allowChinaDataTransfer: false });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!draft.targetLang) {
      setError(intl.formatMessage({ id: 'options.error.targetLanguage' }));
      return;
    }
    if (draft.provider === 'custom' && !draft.baseUrl.trim()) {
      setError(intl.formatMessage({ id: 'options.error.apiUrl' }));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        provider: draft.provider,
        allowChinaDataTransfer: draft.allowChinaDataTransfer,
        baseUrl: resolveProviderBaseUrl(draft.provider, draft.baseUrl.trim()),
        apiKey: draft.apiKey,
        model: draft.model.trim(),
        targetLang: draft.targetLang,
        translationMode: draft.translationMode,
        summaryPosition: draft.summaryPosition,
        autoRecoverContentScript: draft.autoRecoverContentScript,
        copyIncludeLink: draft.copyIncludeLink,
        copySeparator: draft.copySeparator,
        uiLocale: draft.uiLocale,
      });
      setDraft((current) => ({ ...current, model: draft.model.trim() }));
      showSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const preset = getProviderPreset(draft.provider);
  const isCustom = draft.provider === 'custom';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.formatMessage({ id: 'options.title' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="ui-locale">
              {intl.formatMessage({ id: 'options.uiLanguage' })}
            </Label>
            <Select
              value={draft.uiLocale}
              onValueChange={(value) => patchDraft({ uiLocale: value as LocaleSetting })}
            >
              <SelectTrigger id="ui-locale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALE_SETTINGS.map((setting) => (
                  <SelectItem key={setting} value={setting}>
                    {intl.formatMessage({ id: UI_LOCALE_LABEL_IDS[setting] })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'options.uiLanguageHint' })}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="provider">{intl.formatMessage({ id: 'options.provider' })}</Label>
            <Select
              value={draft.provider}
              onValueChange={(value) => onProviderChange(value as ProviderId)}
            >
              <SelectTrigger id="provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_CATEGORIES.map((category) => (
                  <SelectGroup key={category}>
                    <SelectLabel>
                      {intl.formatMessage({ id: PROVIDER_CATEGORY_LABEL_IDS[category] })}
                    </SelectLabel>
                    {listProvidersByCategory(category)
                      .filter((item) => isProviderAllowed(item.id, draft.allowChinaDataTransfer))
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {intl.formatMessage({ id: PROVIDER_LABEL_IDS[item.id] })}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id="allow-china-data"
                checked={draft.allowChinaDataTransfer}
                onCheckedChange={(checked) => onAllowChinaDataTransferChange(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="allow-china-data" className="font-normal">
                {intl.formatMessage({ id: 'options.allowChinaData' })}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'options.allowChinaDataHint' })}
            </p>
          </div>

          {isCustom && (
            <div className="grid gap-2">
              <Label htmlFor="base-url">{intl.formatMessage({ id: 'options.apiUrl' })}</Label>
              <Input
                id="base-url"
                value={draft.baseUrl}
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                placeholder={intl.formatMessage({ id: 'options.apiUrlPlaceholder' })}
                onChange={(event) => patchDraft({ baseUrl: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: 'options.apiUrlHint' })}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="api-key">{intl.formatMessage({ id: 'options.apiKey' })}</Label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              value={draft.apiKey}
              onChange={(event) => patchDraft({ apiKey: event.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="model">{intl.formatMessage({ id: 'options.model' })}</Label>
            <Input
              id="model"
              value={draft.model}
              spellCheck={false}
              autoComplete="off"
              placeholder={preset.modelPlaceholder}
              onChange={(event) => patchDraft({ model: event.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target-language">
              {intl.formatMessage({ id: 'options.targetLanguage' })}
            </Label>
            <LanguageCombobox
              value={draft.targetLang}
              onValueChange={(code) => patchDraft({ targetLang: code })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="translation-mode">
              {intl.formatMessage({ id: 'options.translationMode' })}
            </Label>
            <Select
              value={draft.translationMode}
              onValueChange={(value) => patchDraft({ translationMode: value as TranslationMode })}
            >
              <SelectTrigger id="translation-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSLATION_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {intl.formatMessage({ id: TRANSLATION_MODE_LABEL_IDS[mode] })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: TRANSLATION_MODE_NOTE_IDS[draft.translationMode] })}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary-position">
              {intl.formatMessage({ id: 'options.summaryPosition' })}
            </Label>
            <Select
              value={draft.summaryPosition}
              onValueChange={(value) => patchDraft({ summaryPosition: value as SummaryPosition })}
            >
              <SelectTrigger id="summary-position" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {intl.formatMessage({ id: SUMMARY_POSITION_LABEL_IDS[position] })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'options.summaryPositionHint' })}
            </p>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id="copy-include-link"
                checked={draft.copyIncludeLink}
                onCheckedChange={(checked) => patchDraft({ copyIncludeLink: checked === true })}
                className="mt-0.5"
              />
              <Label htmlFor="copy-include-link" className="font-normal">
                {intl.formatMessage({ id: 'options.copyIncludeLink' })}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'options.copyIncludeLinkHint' })}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="copy-separator">
              {intl.formatMessage({ id: 'options.copySeparator' })}
            </Label>
            <Input
              id="copy-separator"
              value={draft.copySeparator}
              spellCheck={false}
              autoComplete="off"
              placeholder={intl.formatMessage({ id: 'options.copySeparatorPlaceholder' })}
              onChange={(event) => patchDraft({ copySeparator: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'options.copySeparatorHint' })}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="auto-recover"
              checked={draft.autoRecoverContentScript}
              onCheckedChange={(checked) => patchDraft({ autoRecoverContentScript: checked === true })}
              className="mt-0.5"
            />
            <Label htmlFor="auto-recover" className="font-normal">
              {intl.formatMessage({ id: 'options.autoRecover' })}
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {intl.formatMessage({ id: 'options.save' })}
            </Button>
            {saved && (
              <Alert variant="success" className="w-auto py-1.5">
                {intl.formatMessage({ id: 'options.saved' })}
              </Alert>
            )}
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}
        </form>
      </CardContent>
    </Card>
  );
}
