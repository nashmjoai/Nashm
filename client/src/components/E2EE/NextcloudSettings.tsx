/**
 * Nextcloud Settings Component
 *
 * قسم إعدادات ربط سيرفر Nextcloud في صفحة الإعدادات.
 * يظهر فقط عندما يكون E2EE مفعلاً.
 */

import React, { useState, useCallback } from 'react';
import {
  Cloud,
  Link2,
  Link2Off,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Server,
  User,
  Key,
  FolderOpen,
} from 'lucide-react';
import useNextcloudSync from '~/hooks/useNextcloudSync';
import type { E2EEStatus } from '~/hooks/useE2EE';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NextcloudSettingsProps {
  e2eeStatus: E2EEStatus;
  masterKey: CryptoKey;
  salt: string;
  onSyncComplete?: () => void;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        connected
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-token-surface-secondary text-token-text-secondary'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {connected ? 'متصل' : 'غير متصل'}
    </span>
  );
}

function ConnectedView({
  ncSync,
  masterKey,
  salt,
  onDisconnect,
  onSyncNow,
}: {
  ncSync: NonNullable<E2EEStatus['nextcloudSync']>;
  masterKey: CryptoKey;
  salt: string;
  onDisconnect: () => Promise<void>;
  onSyncNow: () => Promise<void>;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncStatus(null);
    try {
      await onSyncNow();
      setLastSyncStatus('success');
    } catch {
      setLastSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* معلومات الاتصال */}
      <div className="rounded-xl border border-token-border-light bg-token-surface-secondary p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-token-text-primary">سيرفر Nextcloud</h4>
          <StatusBadge connected />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-3.5 w-3.5 text-token-text-tertiary" />
            <span className="text-token-text-secondary">السيرفر:</span>
            <a
              href={ncSync.serverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-600 hover:underline dark:text-violet-400"
            >
              {ncSync.serverUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-token-text-tertiary" />
            <span className="text-token-text-secondary">المستخدم:</span>
            <span className="text-token-text-primary">{ncSync.ncUsername}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-3.5 w-3.5 text-token-text-tertiary" />
            <span className="text-token-text-secondary">المجلد:</span>
            <span className="font-mono text-xs text-token-text-primary">{ncSync.syncFolder}</span>
          </div>

          {ncSync.lastSyncAt && (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-3.5 w-3.5 text-token-text-tertiary" />
              <span className="text-token-text-secondary">آخر مزامنة:</span>
              <span className="text-token-text-primary">
                {new Date(ncSync.lastSyncAt).toLocaleString('ar')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* نتيجة المزامنة */}
      {lastSyncStatus === 'success' && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>تمت المزامنة بنجاح!</span>
        </div>
      )}
      {lastSyncStatus === 'error' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>فشلت المزامنة. تحقق من الاتصال.</span>
        </div>
      )}

      {/* أزرار الإجراءات */}
      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-300 bg-violet-50 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isSyncing ? 'جارٍ المزامنة...' : 'مزامنة الآن'}
        </button>

        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {isDisconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2Off className="h-4 w-4" />
          )}
          فصل
        </button>
      </div>
    </div>
  );
}

function ConnectForm({
  masterKey,
  salt,
  onConnect,
}: {
  masterKey: CryptoKey;
  salt: string;
  onConnect: (opts: {
    serverUrl: string;
    ncUsername: string;
    appToken: string;
    syncFolder?: string;
  }) => Promise<void>;
}) {
  const { verifyServer, isLoading, error, clearError } = useNextcloudSync();

  const [serverUrl, setServerUrl] = useState('');
  const [ncUsername, setNcUsername] = useState('');
  const [appToken, setAppToken] = useState('');
  const [syncFolder, setSyncFolder] = useState('/Nashm-E2EE');
  const [serverInfo, setServerInfo] = useState<{ version: string; productname: string } | null>(
    null,
  );
  const [step, setStep] = useState<'url' | 'credentials'>('url');

  const handleVerify = useCallback(async () => {
    clearError();
    const info = await verifyServer(serverUrl);
    if (info) {
      setServerInfo(info);
      setStep('credentials');
    }
  }, [serverUrl, verifyServer, clearError]);

  const handleConnect = useCallback(async () => {
    await onConnect({ serverUrl, ncUsername, appToken, syncFolder });
  }, [serverUrl, ncUsername, appToken, syncFolder, onConnect]);

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {step === 'url' ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-token-text-primary">
              رابط سيرفر Nextcloud
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://cloud.example.com"
                className="flex-1 rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2.5 text-sm text-token-text-primary placeholder:text-token-text-tertiary focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                dir="ltr"
              />
              <button
                onClick={handleVerify}
                disabled={!serverUrl || isLoading}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                فحص
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* معلومات السيرفر المحقق */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                {serverInfo?.productname || 'Nextcloud'}
              </p>
              <p className="text-emerald-600 dark:text-emerald-500">الإصدار {serverInfo?.version}</p>
            </div>
          </div>

          {/* بيانات تسجيل الدخول */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-token-text-primary">
                <User className="h-3.5 w-3.5" />
                اسم المستخدم
              </label>
              <input
                value={ncUsername}
                onChange={(e) => setNcUsername(e.target.value)}
                className="w-full rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2.5 text-sm text-token-text-primary placeholder:text-token-text-tertiary focus:border-violet-400 focus:outline-none"
                placeholder="username"
                dir="ltr"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-token-text-primary">
                <Key className="h-3.5 w-3.5" />
                App Token
              </label>
              <input
                type="password"
                value={appToken}
                onChange={(e) => setAppToken(e.target.value)}
                className="w-full rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2.5 text-sm text-token-text-primary placeholder:text-token-text-tertiary focus:border-violet-400 focus:outline-none"
                placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-token-text-secondary">
                أنشئ App Token من: إعدادات Nextcloud → أمان → App passwords
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-token-text-primary">
                <FolderOpen className="h-3.5 w-3.5" />
                مجلد المزامنة
              </label>
              <input
                value={syncFolder}
                onChange={(e) => setSyncFolder(e.target.value)}
                className="w-full rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2.5 font-mono text-sm text-token-text-primary focus:border-violet-400 focus:outline-none"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('url')}
              className="rounded-xl border border-token-border-light px-4 py-2.5 text-sm font-medium text-token-text-secondary hover:bg-token-surface-secondary"
            >
              رجوع
            </button>
            <button
              onClick={handleConnect}
              disabled={!ncUsername || !appToken || isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              ربط السيرفر
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NextcloudSettings({
  e2eeStatus,
  masterKey,
  salt,
  onSyncComplete,
}: NextcloudSettingsProps) {
  const { connectNextcloud, disconnectNextcloud, syncNow } = useNextcloudSync();
  const [localStatus, setLocalStatus] = useState(e2eeStatus.nextcloudSync);

  const handleConnect = useCallback(
    async (opts: {
      serverUrl: string;
      ncUsername: string;
      appToken: string;
      syncFolder?: string;
    }) => {
      const success = await connectNextcloud(opts, masterKey, salt);
      if (success) {
        setLocalStatus({
          enabled: true,
          serverUrl: opts.serverUrl,
          ncUsername: opts.ncUsername,
          syncFolder: opts.syncFolder || '/Nashm-E2EE',
          lastSyncAt: undefined,
        });
      }
    },
    [connectNextcloud, masterKey, salt],
  );

  const handleDisconnect = useCallback(async () => {
    const success = await disconnectNextcloud();
    if (success) setLocalStatus(null);
  }, [disconnectNextcloud]);

  const handleSyncNow = useCallback(async () => {
    if (!localStatus) return;
    // جلب App Token المشفر من السيرفر ثم تشغيل المزامنة
    const res = await fetch('/api/e2ee/status', { credentials: 'include' });
    if (res.ok) {
      await syncNow(
        {
          serverUrl: localStatus.serverUrl!,
          username: localStatus.ncUsername!,
          encryptedTokenB64: '', // يُجلب من السيرفر عند الحاجة
          syncFolder: localStatus.syncFolder,
        },
        masterKey,
        salt,
      );
      onSyncComplete?.();
    }
  }, [localStatus, syncNow, masterKey, salt, onSyncComplete]);

  return (
    <div className="rounded-2xl border border-token-border-light bg-token-surface-primary p-5" dir="rtl">
      {/* العنوان */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
            <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-token-text-primary">مزامنة Nextcloud</h3>
            <p className="text-xs text-token-text-secondary">
              مزامنة المحادثات المشفرة مع سيرفرك الخاص
            </p>
          </div>
        </div>
        <StatusBadge connected={localStatus?.enabled ?? false} />
      </div>

      <div className="border-t border-token-border-light pt-4">
        {localStatus?.enabled ? (
          <ConnectedView
            ncSync={localStatus}
            masterKey={masterKey}
            salt={salt}
            onDisconnect={handleDisconnect}
            onSyncNow={handleSyncNow}
          />
        ) : (
          <ConnectForm masterKey={masterKey} salt={salt} onConnect={handleConnect} />
        )}
      </div>
    </div>
  );
}

export default NextcloudSettings;
