/**
 * useE2EE - React Hook لإدارة تشفير التخزين (Encrypted at Rest / Dual-Lock)
 *
 * المعمارية الحقيقية:
 *  1. التفعيل: توليد trueMasterKey وتغليفه بالـ Passphrase والـ 12 كلمة لحفظ القفلين في السيرفر.
 *  2. الفتح العادي: استرجاع wrappedKeyPassphrase وتفكيك قفله بـ Passphrase.
 *  3. الاسترجاع عند مسح المتصفح / جهاز جديد: استرجاع wrappedKeyRecovery وتفكيك قفله بـ 12 كلمة.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createMasterKeyBundle,
  deriveLockKey,
  unwrapMasterKey,
  encryptMessage,
  decryptMessage,
  encryptConversation,
  decryptConversation,
  encryptFileChunked,
  decryptFileChunked,
  type EncryptedPayload,
  type EncryptedFileChunk,
} from 'nashm-data-provider';

export interface E2EEStatus {
  enabled: boolean;
  hasSalt: boolean;
  hasPublicKey: boolean;
  nextcloudSync?: {
    enabled: boolean;
    serverUrl?: string;
    ncUsername?: string;
    syncFolder?: string;
    lastSyncAt?: Date | string;
  } | null;
}

export interface UseE2EEReturn {
  isEnabled: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
  status: E2EEStatus | null;

  setupE2EE: (passphrase: string, recoveryWords: string[]) => Promise<void>;
  unlockE2EE: (passphrase: string) => Promise<boolean>;
  recoverWith12Words: (recoveryWords: string[]) => Promise<boolean>;
  lockE2EE: () => void;

  encryptMsg: (conversationId: string, fields: { text?: string; summary?: string }) => Promise<{
    text?: EncryptedPayload;
    summary?: EncryptedPayload;
    isEncrypted: boolean;
  } | null>;

  decryptMsg: (
    conversationId: string,
    fields: {
      text?: EncryptedPayload | string;
      summary?: EncryptedPayload | string;
      isEncrypted?: boolean;
    },
  ) => Promise<{ text?: string; summary?: string } | null>;

  encryptConvo: (
    conversationId: string,
    fields: { title?: string },
  ) => Promise<{ title?: EncryptedPayload; isEncrypted: boolean } | null>;

  decryptConvo: (
    conversationId: string,
    fields: { title?: EncryptedPayload | string; isEncrypted?: boolean },
  ) => Promise<{ title?: string } | null>;

  encryptFile: (fileData: ArrayBuffer, fileId: string) => Promise<EncryptedFileChunk[] | null>;
  decryptFile: (chunks: EncryptedFileChunk[]) => Promise<ArrayBuffer | null>;
}

export function useE2EE(): UseE2EEReturn {
  const [status, setStatus] = useState<E2EEStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masterKeyRef = useRef<CryptoKey | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/e2ee/status', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as E2EEStatus;
        setStatus(data);
      } else {
        setStatus(null);
      }
    } catch (err) {
      console.error('[E2EE] Status fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ─── Setup Dual-Lock Master Key ──────────────────────────────────────────────

  const setupE2EE = useCallback(
    async (passphrase: string, recoveryWords: string[]) => {
      setError(null);
      setIsLoading(true);

      try {
        // 1. توليد trueMasterKey وتغليفه بالـ Passphrase والـ 12 كلمة
        const { trueMasterKey, bundle } = await createMasterKeyBundle(passphrase, recoveryWords);

        // 2. حفظ الأقفال والـ Salt في السيرفر (آمن تماماً لأن السيرفر لا يملك الـ Passphrase ولا الـ 12 كلمة)
        const res = await fetch('/api/e2ee/setup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salt: bundle.salt,
            wrappedKeyPassphrase: bundle.wrappedKeyPassphrase,
            wrappedKeyRecovery: bundle.wrappedKeyRecovery,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Setup failed');
        }

        // 3. احتفاظ بـ trueMasterKey في ذاكرة الجلسة
        masterKeyRef.current = trueMasterKey;
        setIsUnlocked(true);

        await fetchStatus();
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchStatus],
  );

  // ─── Unlock via Passphrase ───────────────────────────────────────────────────

  const unlockE2EE = useCallback(async (passphrase: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/e2ee/salt', { credentials: 'include' });
      if (!res.ok) return false;

      const { salt, wrappedKeyPassphrase } = await res.json();
      if (!wrappedKeyPassphrase) return false;

      const passphraseLockKey = await deriveLockKey(passphrase, salt);
      const trueMasterKey = await unwrapMasterKey(wrappedKeyPassphrase, passphraseLockKey);

      masterKeyRef.current = trueMasterKey;
      setIsUnlocked(true);
      return true;
    } catch {
      setError('كلمة سر التشفير غير صحيحة');
      return false;
    }
  }, []);

  // ─── Recovery via 12-Word Recovery Phrase ───────────────────────────────────

  const recoverWith12Words = useCallback(async (recoveryWords: string[]): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/e2ee/salt', { credentials: 'include' });
      if (!res.ok) return false;

      const { salt, wrappedKeyRecovery } = await res.json();
      if (!wrappedKeyRecovery) return false;

      const recoveryLockKey = await deriveLockKey(recoveryWords.join(' '), salt);
      const trueMasterKey = await unwrapMasterKey(wrappedKeyRecovery, recoveryLockKey);

      masterKeyRef.current = trueMasterKey;
      setIsUnlocked(true);
      return true;
    } catch {
      setError('كلمات الاستعادة غير صحيحة');
      return false;
    }
  }, []);

  const lockE2EE = useCallback(() => {
    masterKeyRef.current = null;
    setIsUnlocked(false);
  }, []);

  // ─── Encrypt & Decrypt Helpers ──────────────────────────────────────────────

  const encryptMsg = useCallback(
    async (conversationId: string, fields: { text?: string; summary?: string }) => {
      const key = masterKeyRef.current;
      if (!key || !status?.enabled) return null;
      return encryptMessage(conversationId, key, fields);
    },
    [status?.enabled],
  );

  const decryptMsg = useCallback(
    async (
      conversationId: string,
      fields: { text?: EncryptedPayload | string; summary?: EncryptedPayload | string; isEncrypted?: boolean },
    ) => {
      const key = masterKeyRef.current;
      if (!key) return null;
      return decryptMessage(conversationId, key, fields);
    },
    [],
  );

  const encryptConvo = useCallback(
    async (conversationId: string, fields: { title?: string }) => {
      const key = masterKeyRef.current;
      if (!key || !status?.enabled) return null;
      return encryptConversation(conversationId, key, fields);
    },
    [status?.enabled],
  );

  const decryptConvo = useCallback(
    async (
      conversationId: string,
      fields: { title?: EncryptedPayload | string; isEncrypted?: boolean },
    ) => {
      const key = masterKeyRef.current;
      if (!key) return null;
      return decryptConversation(conversationId, key, fields);
    },
    [],
  );

  const encryptFile = useCallback(
    async (fileData: ArrayBuffer, fileId: string) => {
      const key = masterKeyRef.current;
      if (!key || !status?.enabled) return null;
      return encryptFileChunked(fileData, fileId, key);
    },
    [status?.enabled],
  );

  const decryptFile = useCallback(
    async (chunks: EncryptedFileChunk[]) => {
      const key = masterKeyRef.current;
      if (!key) return null;
      return decryptFileChunked(chunks, key);
    },
    [],
  );

  return {
    isEnabled: status?.enabled ?? false,
    isUnlocked,
    isLoading,
    error,
    status,
    setupE2EE,
    unlockE2EE,
    recoverWith12Words,
    lockE2EE,
    encryptMsg,
    decryptMsg,
    encryptConvo,
    decryptConvo,
    encryptFile,
    decryptFile,
  };
}

export default useE2EE;
