/**
 * useNextcloudSync - React Hook لإدارة مزامنة Nextcloud
 *
 * يوفر:
 *  - ربط/فصل سيرفر Nextcloud
 *  - التحقق من صحة السيرفر
 *  - تشغيل المزامنة يدوياً أو تلقائياً
 */

import { useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NextcloudServerInfo {
  version: string;
  productname: string;
  maintenance: boolean;
}

export interface NextcloudConnectOptions {
  serverUrl: string;
  ncUsername: string;
  /** App Token كنص صريح - سيُشفَّر في Hook قبل الإرسال */
  appToken: string;
  syncFolder?: string;
}

export interface UseNextcloudSyncReturn {
  /** هل العملية جارية؟ */
  isLoading: boolean;
  /** رسالة خطأ إن وجدت */
  error: string | null;
  /** آخر وقت مزامنة ناجح */
  lastSyncAt: Date | null;

  /**
   * التحقق من صحة سيرفر Nextcloud
   * @returns معلومات السيرفر إذا كان صالحاً
   */
  verifyServer: (serverUrl: string) => Promise<NextcloudServerInfo | null>;

  /**
   * ربط سيرفر Nextcloud
   * يشفر App Token ويحفظ الإعدادات في السيرفر
   */
  connectNextcloud: (
    opts: NextcloudConnectOptions,
    masterKey: CryptoKey,
    salt: string,
  ) => Promise<boolean>;

  /**
   * فصل سيرفر Nextcloud
   */
  disconnectNextcloud: () => Promise<boolean>;

  /**
   * تشغيل المزامنة الكاملة مع Nextcloud
   * يرفع جميع المحادثات المشفرة + حزمة المفاتيح
   */
  syncNow: (
    opts: {
      serverUrl: string;
      username: string;
      encryptedTokenB64: string;
      syncFolder?: string;
    },
    masterKey: CryptoKey,
    salt: string,
  ) => Promise<{ success: boolean; uploaded: number; errors: string[] }>;

  /** مسح رسالة الخطأ */
  clearError: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNextcloudSync(): UseNextcloudSyncReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // ─── Verify Server ────────────────────────────────────────────────────

  const verifyServer = useCallback(
    async (serverUrl: string): Promise<NextcloudServerInfo | null> => {
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch('/api/e2ee/nextcloud/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverUrl }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'Failed to verify server');
          return null;
        }

        return {
          version: data.version,
          productname: data.productname,
          maintenance: data.maintenance,
        };
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ─── Connect Nextcloud ────────────────────────────────────────────────

  const connectNextcloud = useCallback(
    async (
      opts: NextcloudConnectOptions,
      masterKey: CryptoKey,
      salt: string,
    ): Promise<boolean> => {
      setError(null);
      setIsLoading(true);

      try {
        // 1. تشفير App Token محلياً بالمفتاح الرئيسي قبل إرساله للسيرفر
        const { encryptText } = await import('nashm-data-provider');
        const encryptedTokenPayload = await encryptText(opts.appToken, masterKey);
        const encryptedToken = JSON.stringify(encryptedTokenPayload);

        // 2. إرسال الإعدادات المشفرة للسيرفر
        const res = await fetch('/api/e2ee/nextcloud/connect', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverUrl: opts.serverUrl,
            ncUsername: opts.ncUsername,
            encryptedToken,
            syncFolder: opts.syncFolder,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to connect Nextcloud');
          return false;
        }

        return true;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ─── Disconnect Nextcloud ─────────────────────────────────────────────

  const disconnectNextcloud = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/e2ee/nextcloud', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to disconnect');
        return false;
      }

      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Sync Now ─────────────────────────────────────────────────────────

  const syncNow = useCallback(
    async (
      opts: {
        serverUrl: string;
        username: string;
        encryptedTokenB64: string;
        syncFolder?: string;
      },
      masterKey: CryptoKey,
      salt: string,
    ): Promise<{ success: boolean; uploaded: number; errors: string[] }> => {
      setError(null);
      setIsLoading(true);

      try {
        // فك تشفير App Token محلياً
        const { decryptText } = await import('nashm-data-provider');
        const tokenPayload = JSON.parse(opts.encryptedTokenB64);
        const appToken = await decryptText(tokenPayload, masterKey);

        const { fullSync } = await import('nashm-data-provider');

        // جلب المحادثات المشفرة من الـ API
        const convosRes = await fetch('/api/convos?isEncrypted=true&limit=100', {
          credentials: 'include',
        });
        const convosData = await convosRes.json();
        const conversations = Array.isArray(convosData?.conversations) ? convosData.conversations : [];

        const encryptedConversations = conversations.map((c: { conversationId: string }) => ({
          id: c.conversationId,
          data: c,
        }));

        const result = await fullSync(
          {
            serverUrl: opts.serverUrl,
            username: opts.username,
            appToken,
            syncFolder: opts.syncFolder,
          },
          masterKey,
          salt,
          encryptedConversations,
        );

        if (result.success) {
          setLastSyncAt(new Date(result.syncedAt));

          // تحديث وقت المزامنة في السيرفر
          await fetch('/api/e2ee/nextcloud/sync', {
            method: 'POST',
            credentials: 'include',
          });
        }

        return result;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        return { success: false, uploaded: 0, errors: [msg] };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    error,
    lastSyncAt,
    verifyServer,
    connectNextcloud,
    disconnectNextcloud,
    syncNow,
    clearError,
  };
}

export default useNextcloudSync;
