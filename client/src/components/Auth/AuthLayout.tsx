import { ThemeSelector } from '@nashm/client';
import { TStartupConfig } from 'nashm-data-provider';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import { TranslationKeys, useLocalize } from '~/hooks';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { Banner } from '../Banners';
import Footer from './Footer';

function AuthLayout({
  children,
  header,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  isFetching: boolean;
  startupConfig: TStartupConfig | null | undefined;
  startupConfigError: unknown | null | undefined;
  pathname: string;
  error: TranslationKeys | null;
}) {
  const localize = useLocalize();

  const hasStartupConfigError = startupConfigError !== null && startupConfigError !== undefined;
  const DisplayError = () => {
    if (hasStartupConfigError) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize('com_auth_error_login_server')}</ErrorMessage>
        </div>
      );
    } else if (error === 'com_auth_error_invalid_reset_token') {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>
            {localize('com_auth_error_invalid_reset_token')}{' '}
            <a className="font-semibold text-green-600 hover:underline" href="/forgot-password">
              {localize('com_auth_click_here')}
            </a>{' '}
            {localize('com_auth_to_try_again')}
          </ErrorMessage>
        </div>
      );
    } else if (error != null && error) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize(error)}</ErrorMessage>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-gray-900 nashm-auth-bg">
      <Banner />
      <BlinkAnimation active={isFetching}>
        <div className="mt-12 mb-6 flex flex-col items-center justify-center w-full">
          <div className="relative group">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#C41E3A] via-[#1A1A1A] to-[#C41E3A] opacity-45 blur-2xl transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
            <img
              src="/assets/logo.png"
              className="relative h-44 w-44 object-contain nashm-logo-glow transition-transform duration-500 hover:scale-105"
              alt={localize('com_ui_logo', { 0: startupConfig?.appTitle ?? 'NASHM' })}
            />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-wider text-gray-950 dark:text-white flex items-center gap-2 drop-shadow-sm font-sans">
            <span className="text-[#C41E3A]">NASHM</span>
            <span className="text-gray-900 dark:text-gray-100">نشم</span>
          </h2>
        </div>
      </BlinkAnimation>
      <DisplayError />
      <div className="absolute bottom-0 left-0 md:m-4">
        <ThemeSelector />
      </div>

      <main className="flex flex-grow items-center justify-center px-4 py-6">
        <div className="w-authPageWidth overflow-hidden bg-white/95 backdrop-blur-md border border-gray-100/50 shadow-2xl px-6 py-6 dark:bg-gray-900/95 dark:border-gray-800/50 sm:max-w-md sm:rounded-2xl transition-all duration-300">
          {!hasStartupConfigError && !isFetching && header && (
            <h1
              className="mb-4 text-center text-3xl font-semibold text-black dark:text-white"
              style={{ userSelect: 'none' }}
            >
              {header}
            </h1>
          )}
          {children}
          {!pathname.includes('2fa') &&
            (pathname.includes('login') || pathname.includes('register')) && (
              <SocialLoginRender startupConfig={startupConfig} />
            )}
        </div>
      </main>
      <Footer startupConfig={startupConfig} />
    </div>
  );
}

export default AuthLayout;
