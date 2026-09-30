import {
  AlertTriangle,
  Copy,
  Languages,
  RefreshCw,
  RotateCcw,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePopupController } from '@/features/popup/use-popup-controller';

export function PopupApp() {
  const intl = useIntl();
  const controller = usePopupController();
  const disabled = controller.apiKeyMissing;

  return (
    <div className="w-[340px] bg-background p-4 font-sans text-foreground">
      <h1 className="mb-3 text-base font-semibold">
        {intl.formatMessage({ id: 'popup.title' })}
      </h1>

      <div className="grid gap-2">
        <Button type="button" onClick={controller.translate} disabled={disabled}>
          <Languages />
          {intl.formatMessage({ id: 'popup.translateLabel' }, { count: controller.tabCount })}
        </Button>
        <Button type="button" variant="outline" onClick={controller.restore}>
          <RotateCcw />
          {intl.formatMessage({ id: 'popup.restoreLabel' }, { count: controller.tabCount })}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={controller.summarize}
          disabled={disabled || controller.busy === 'summarize'}
        >
          {controller.busy === 'summarize' ? <Spinner /> : <Sparkles />}
          {intl.formatMessage({ id: 'popup.summarizeButton' })}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={controller.copyInfo}
          disabled={disabled || controller.busy === 'copy'}
        >
          {controller.busy === 'copy' ? <Spinner /> : <Copy />}
          {intl.formatMessage({ id: 'popup.copyButton' })}
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {intl.formatMessage({ id: 'popup.summarizeNote' })}
      </p>

      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        {controller.translating && <Spinner className="size-3" />}
        <span>{controller.statusText}</span>
      </div>

      {controller.error && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{controller.error}</span>
        </Alert>
      )}

      {controller.reloadTabId !== null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={controller.reload}
          disabled={controller.busy === 'reload'}
        >
          <RefreshCw />
          {intl.formatMessage({ id: 'popup.reloadAndTranslate' })}
        </Button>
      )}

      <button
        type="button"
        onClick={controller.openOptions}
        className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <Settings className="size-3.5" />
        {intl.formatMessage({ id: 'popup.openSettings' })}
      </button>
    </div>
  );
}
