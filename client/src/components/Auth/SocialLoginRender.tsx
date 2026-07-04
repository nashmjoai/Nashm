import { GoogleIcon } from '@nashm/client';
import { useLocalize } from '~/hooks';
import { TStartupConfig } from 'nashm-data-provider';

function SocialLoginRender({
  startupConfig,
}: {
  startupConfig: TStartupConfig | null | undefined;
}) {
  const localize = useLocalize();

  if (!startupConfig) {
    return null;
  }

  const serverDomain = startupConfig.serverDomain || '';

  const showGoogle = startupConfig.googleLoginEnabled;

  if (!showGoogle) {
    return null;
  }

  return (
    <div className="w-full mt-6">
      {startupConfig.emailLoginEnabled && (
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {localize('com_auth_or' as any) || 'Or'}
          </span>
          <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
        </div>
      )}
      
      <div className="mt-2">
        <a
          aria-label="Sign in with Google"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow active:scale-[0.98]"
          href={`${serverDomain}/oauth/google`}
          data-testid="google"
        >
          <GoogleIcon />
          <span>{localize('com_auth_google_login' as any) || 'Sign in with Google'}</span>
        </a>
      </div>
    </div>
  );
}

export default SocialLoginRender;

