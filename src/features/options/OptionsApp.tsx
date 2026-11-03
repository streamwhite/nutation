import { useIntl } from 'react-intl';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { CacheSection } from '@/features/options/CacheSection';
import { SettingsSection } from '@/features/options/SettingsSection';
import { TranslateOnOpenSection } from '@/features/options/TranslateOnOpenSection';
import { useOptionsSettings } from '@/features/options/use-options-settings';

export function OptionsApp() {
  const intl = useIntl();
  const { settings, error, save } = useOptionsSettings();

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Alert variant="destructive">{error}</Alert>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto grid max-w-2xl gap-6 p-6">
        <h1 className="sr-only">{intl.formatMessage({ id: 'options.title' })}</h1>
        <SettingsSection settings={settings} onSave={save} />
        <CacheSection settings={settings} onSave={save} />
        <TranslateOnOpenSection settings={settings} onSave={save} />
      </div>
    </div>
  );
}
