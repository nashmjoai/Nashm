import { Button } from '@nashm/client';
import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { useLocalize } from '~/hooks';

export default function RouteErrorBoundary() {
  const localize = useLocalize();
  const typedError = useRouteError() as {
    message?: string;
    stack?: string;
    status?: number;
    statusText?: string;
    data?: unknown;
  };

  useEffect(() => {
    if (window.__nashmIsStaleAssetError?.(typedError) === true) {
      window.__nashmRecoverStaleAssets?.();
    }
  }, [typedError]);

  const handleRefresh = () => {
    if (window.__nashmRecoverStaleAssets?.() === true) {
      return;
    }
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center bg-surface-primary bg-gradient-to-br"
    >
      <div className="bg-surface-primary/60 mx-4 w-11/12 max-w-4xl rounded-2xl border border-border-light p-8 shadow-2xl backdrop-blur-xl">
        <h2 className="mb-6 text-center text-3xl font-medium tracking-tight text-text-primary">
          {localize('com_ui_error_unexpected')}
        </h2>

        {/* Error Message */}
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-gray-600 dark:text-gray-200">
          <h3 className="mb-2 font-medium">{localize('com_ui_error_message_prefix')}</h3>
          <p className="text-sm font-light leading-relaxed text-text-primary">
            Something went wrong while opening this page. Refresh the page and try again. If the
            problem continues, contact your administrator.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm font-light text-text-secondary">
            {localize('com_ui_error_try_following_prefix')}:
          </p>
          <ul className="list-inside list-disc text-sm text-text-secondary">
            <li>{localize('com_ui_refresh_page')}</li>
            <li>{localize('com_ui_clear_browser_cache')}</li>
            <li>{localize('com_ui_check_internet')}</li>
            <li>{localize('com_ui_contact_admin_if_issue_persists')}</li>
          </ul>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              variant="submit"
              onClick={handleRefresh}
              className="w-full sm:w-auto"
              aria-label={localize('com_ui_refresh_page')}
            >
              {localize('com_ui_refresh_page')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
