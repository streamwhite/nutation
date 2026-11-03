import { useIntl } from 'react-intl';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFlash } from '@/features/options/use-flash';
import { clearTranslationCache } from '@/features/translate/cache';
import {
  estimateCacheCapacityBytes,
  resolveCacheMaxEntries,
} from '@/features/translate/cache-max-entries';
import {
  getCacheStoreStats,
  trimStoreToMaxEntries,
  type CacheStoreStats,
} from '@/features/translate/cache-store';
import { formatBytes } from '@/shared/format-bytes';
import {
  TRANSLATION_CACHE_ENTRIES_HARD_LIMIT,
  TRANSLATION_CACHE_MIN_ENTRIES,
} from '@/shared/constants';
import type { ExtensionSettings } from '@/shared/settings';

type CacheSectionProps = {
  settings: ExtensionSettings;
  onSave: (patch: Partial<ExtensionSettings>) => Promise<ExtensionSettings>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function CacheSection({ settings, onSave }: CacheSectionProps) {
  const intl = useIntl();
  const [maxEntries, setMaxEntries] = useState(() => String(settings.cacheMaxEntries));
  const [stats, setStats] = useState<CacheStoreStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, showSaved] = useFlash();

  const refresh = useCallback(async (entries: number) => {
    try {
      setStats(await getCacheStoreStats(entries));
      setError(null);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, []);

  useEffect(() => {
    setMaxEntries(String(settings.cacheMaxEntries));
    void refresh(settings.cacheMaxEntries);
  }, [settings.cacheMaxEntries, refresh]);

  const resolvedEntries = resolveCacheMaxEntries(maxEntries, settings.cacheMaxEntries);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const savedSettings = await onSave({ cacheMaxEntries: resolvedEntries });
      await trimStoreToMaxEntries(savedSettings.cacheMaxEntries);
      setMaxEntries(String(savedSettings.cacheMaxEntries));
      await refresh(savedSettings.cacheMaxEntries);
      showSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setError(null);
    try {
      await clearTranslationCache();
      await refresh(resolvedEntries);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const estimate = intl.formatMessage(
    { id: 'options.cache.capacityEstimate' },
    { size: formatBytes(estimateCacheCapacityBytes(resolvedEntries)) },
  );

  const rows: Array<{ label: string; value: string }> = [
    {
      label: intl.formatMessage({ id: 'options.cache.entryCount' }),
      value: stats
        ? `${stats.entryCount.toLocaleString()} / ${stats.maxEntries.toLocaleString()}`
        : '—',
    },
    {
      label: intl.formatMessage({ id: 'options.cache.dataSize' }),
      value: stats ? formatBytes(stats.estimatedBytes) : '—',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.formatMessage({ id: 'options.cache.title' })}</CardTitle>
        <CardDescription>{intl.formatMessage({ id: 'options.cache.description' })}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="cache-max-entries">
            {intl.formatMessage({ id: 'options.cache.maxEntries' })}
          </Label>
          <Input
            id="cache-max-entries"
            type="number"
            inputMode="numeric"
            min={TRANSLATION_CACHE_MIN_ENTRIES}
            max={TRANSLATION_CACHE_ENTRIES_HARD_LIMIT}
            step={TRANSLATION_CACHE_MIN_ENTRIES}
            value={maxEntries}
            onChange={(event) => setMaxEntries(event.target.value)}
            onBlur={() => setMaxEntries(String(resolvedEntries))}
          />
          <p className="text-xs text-muted-foreground">{estimate}</p>
        </div>

        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Spinner />}
            {intl.formatMessage({ id: 'options.cache.save' })}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClear}>
            {intl.formatMessage({ id: 'options.cache.clear' })}
          </Button>
          {saved && (
            <Alert variant="success" className="w-auto py-1.5">
              {intl.formatMessage({ id: 'options.cache.saved' })}
            </Alert>
          )}
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}
      </CardContent>
    </Card>
  );
}
