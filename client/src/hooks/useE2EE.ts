/**
 * useE2EE - React Hook لإدارة تشفير التخزين (Encrypted at Rest / Dual-Lock)
 *
 * المعمارية الحقيقية:
 *  1. التفعيل: توليد trueMasterKey وتغليفه بالـ Passphrase والـ 12 كلمة لحفظ القفلين في السيرفر.
 *  2. الفتح العادي: استرجاع wrappedKeyPassphrase وتفكيك قفله بـ Passphrase.
 *  3. الاسترجاع عند مسح المتصفح / جهاز جديد: استرجاع wrappedKeyRecovery وتفكيك قفله بـ 12 كلمة.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createMasterKeyBundle,
  createEncryptedInviteSecret,
  decryptConversationKeyFromInvite,
  decryptMessageRecord,
  decryptFileMetadata,
  deriveLockKey,
  encryptMessageRecord,
  getConversationKey,
  getWrappedConversationKey,
  isEncryptedPayload,
  restoreConversationKey,
  unwrapMasterKey,
  encryptMessage,
  encryptConversationKeyForInvite,
  hashEncryptedInviteSecret,
  decryptMessage,
  encryptConversation,
  decryptConversation,
  encryptFileChunked,
  decryptFileChunked,
  type EncryptedPayload,
  type EncryptedFileChunk,
  getActiveEncryptedInvite,
  setActiveEncryptedInvite,
  storeConversationKey,
} from 'nashm-data-provider';
import type { ReactNode } from 'react';
import type { TConversation, TMessage } from 'nashm-data-provider';

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

  encryptFile: (
    fileData: ArrayBuffer,
    fileId: string,
    metadata?: { filename: string; mimeType: string },
  ) => Promise<EncryptedFileChunk[] | null>;
  decryptFile: (chunks: EncryptedFileChunk[]) => Promise<ArrayBuffer | null>;
  decryptFileInfo: (
    chunks: EncryptedFileChunk[],
  ) => Promise<{ filename: string; mimeType: string } | null>;
  protectStoredConversation: (
    conversation: Partial<TConversation> & Pick<TConversation, 'conversationId'>,
    messages: TMessage[],
  ) => Promise<void>;
  decryptStoredMessages: (messages: TMessage[]) => Promise<TMessage[]>;
  createEncryptedInvite: (
    conversationId: string,
    options: { role: 'read' | 'write'; recipientEmail?: string },
  ) => Promise<{ inviteId: string; secret: string }>;
  activateEncryptedInvite: (
    inviteId: string,
    secret: string,
  ) => Promise<{ conversationId: string; role: 'read' | 'write' }>;
}

type EncryptedStoredMessage = TMessage & {
  encryptedData?: EncryptedPayload;
  isEncrypted?: boolean;
};

const lockedMessage = '🔒 الرسالة مشفّرة. أدخل عبارة تشفير البيانات لعرضها.';

const E2EEContext = createContext<UseE2EEReturn | null>(null);

function useE2EEState(): UseE2EEReturn {
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
        const data = (await res.json()) as E2EEStatus & { e2eeEnabled?: boolean };
        setStatus({ ...data, enabled: data.enabled ?? data.e2eeEnabled ?? false });
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
      const encrypted = await encryptMessage(conversationId, key, fields);
      const wrappedKey = await getWrappedConversationKey(conversationId);
      if (!wrappedKey) {
        throw new Error('Conversation key was not created');
      }
      const response = await fetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrappedKey }),
      });
      if (!response.ok) {
        throw new Error('Failed to back up the encrypted conversation key');
      }
      return encrypted;
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
      const localKey = await getConversationKey(conversationId, key);
      if (!localKey) {
        const response = await fetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key`, {
          credentials: 'include',
        });
        if (!response.ok) return null;
        const { wrappedKey } = (await response.json()) as { wrappedKey?: string };
        if (!wrappedKey || !(await restoreConversationKey(conversationId, wrappedKey, key))) {
          return null;
        }
      }
      return decryptMessage(conversationId, key, fields);
    },
    [],
  );

  const encryptConvo = useCallback(
    async (conversationId: string, fields: { title?: string }) => {
      const key = masterKeyRef.current;
      if (!key || !status?.enabled) return null;
      const encrypted = await encryptConversation(conversationId, key, fields);
      const wrappedKey = await getWrappedConversationKey(conversationId);
      if (!wrappedKey) {
        throw new Error('Conversation key was not created');
      }
      const response = await fetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrappedKey }),
      });
      if (!response.ok) {
        throw new Error('Failed to back up the encrypted conversation key');
      }
      return encrypted;
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
      const localKey = await getConversationKey(conversationId, key);
      if (!localKey) {
        const response = await fetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key`, {
          credentials: 'include',
        });
        if (!response.ok) return null;
        const { wrappedKey } = (await response.json()) as { wrappedKey?: string };
        if (!wrappedKey || !(await restoreConversationKey(conversationId, wrappedKey, key))) {
          return null;
        }
      }
      return decryptConversation(conversationId, key, fields);
    },
    [],
  );

  const encryptFile = useCallback(
    async (fileData: ArrayBuffer, fileId: string, metadata?: { filename: string; mimeType: string }) => {
      const key = masterKeyRef.current;
      if (!key || !status?.enabled) return null;
      return encryptFileChunked(fileData, fileId, key, undefined, metadata);
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

  const decryptFileInfo = useCallback(async (chunks: EncryptedFileChunk[]) => {
    const key = masterKeyRef.current;
    if (!key) return null;
    return decryptFileMetadata(chunks, key);
  }, []);

  const ensureConversationKey = useCallback(async (conversationId: string, masterKey: CryptoKey) => {
    if (await getConversationKey(conversationId, masterKey)) {
      return true;
    }

    const response = await fetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key`, {
      credentials: 'include',
    });
    if (!response.ok) {
      return false;
    }
    const { wrappedKey } = (await response.json()) as { wrappedKey?: string };
    return !!wrappedKey && restoreConversationKey(conversationId, wrappedKey, masterKey);
  }, []);

  const protectStoredConversation = useCallback(
    async (
      conversation: Partial<TConversation> & Pick<TConversation, 'conversationId'>,
      messages: TMessage[],
    ): Promise<void> => {
      const conversationId = conversation.conversationId;
      const key = masterKeyRef.current;
      if (!conversationId || !key || !status?.enabled) {
        throw new Error('Encryption is locked or unavailable');
      }

      const encryptedMessages = await Promise.all(
        messages.map(async (message) => ({
          messageId: message.messageId,
          message: {
            parentMessageId: message.parentMessageId,
            isCreatedByUser: message.isCreatedByUser,
            sender: message.sender,
            model: message.model,
            endpoint: message.endpoint,
            tokenCount: message.tokenCount,
            iconURL: message.iconURL,
            finish_reason: message.finish_reason,
            error: message.error,
            unfinished: message.unfinished,
            thread_id: message.thread_id,
          },
          ...(await encryptMessageRecord(conversationId, key, {
            text: message.text,
            summary: (message as TMessage & { summary?: string }).summary,
            content: message.content,
            quotes: message.quotes,
            files: message.files,
          })),
        })),
      );
      const wrappedKey = await getWrappedConversationKey(conversationId);
      if (!wrappedKey) {
        throw new Error('Conversation key was not created');
      }

      const invite = getActiveEncryptedInvite(conversationId);
      const response = await fetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/snapshot`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrappedKey,
          encryptedInvite: invite
            ? { inviteId: invite.inviteId, secret: invite.secret }
            : undefined,
          conversation: {
            endpoint: conversation.endpoint,
            endpointType: conversation.endpointType,
            model: conversation.model,
            agent_id: conversation.agent_id,
            assistant_id: conversation.assistant_id,
            chatProjectId: conversation.chatProjectId,
            isTemporary: conversation.isTemporary,
          },
          messages: encryptedMessages,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to store encrypted conversation data');
      }
    },
    [status?.enabled],
  );

  const decryptStoredMessages = useCallback(
    async (messages: TMessage[]): Promise<TMessage[]> => {
      const key = masterKeyRef.current;
      if (!key) {
        return messages.map((message) => {
          const encrypted = message as EncryptedStoredMessage;
          return encrypted.isEncrypted && isEncryptedPayload(encrypted.encryptedData)
            ? { ...message, text: lockedMessage, content: [] }
            : message;
        });
      }

      return Promise.all(
        messages.map(async (message) => {
          const encrypted = message as EncryptedStoredMessage;
          if (!encrypted.isEncrypted || !isEncryptedPayload(encrypted.encryptedData)) {
            return message;
          }
          if (!(await ensureConversationKey(message.conversationId ?? '', key))) {
            return { ...message, text: lockedMessage, content: [] };
          }
          try {
            const decrypted = await decryptMessageRecord(
              message.conversationId ?? '',
              key,
              encrypted.encryptedData,
            );
            return { ...message, ...decrypted } as TMessage;
          } catch {
            return { ...message, text: lockedMessage, content: [] };
          }
        }),
      );
    },
    [ensureConversationKey],
  );

  const createEncryptedInvite = useCallback(
    async (
      conversationId: string,
      options: { role: 'read' | 'write'; recipientEmail?: string },
    ) => {
      const masterKey = masterKeyRef.current;
      if (!masterKey || !status?.enabled) {
        throw new Error('Unlock encrypted storage before creating an invitation');
      }
      const conversationKey = await getConversationKey(conversationId, masterKey);
      if (!conversationKey) {
        throw new Error('The encrypted conversation key is unavailable on this device');
      }

      const accessSecret = createEncryptedInviteSecret();
      const keySecret = createEncryptedInviteSecret();
      const response = await fetch(
        `/api/e2ee/conversations/${encodeURIComponent(conversationId)}/invitations`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: options.role,
            recipientEmail: options.recipientEmail?.trim().toLowerCase() || undefined,
            secretHash: await hashEncryptedInviteSecret(accessSecret),
            encryptedConversationKey: await encryptConversationKeyForInvite(conversationKey, keySecret),
          }),
        },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || 'Failed to create encrypted invitation');
      }
      const data = (await response.json()) as { inviteId: string };
      return { inviteId: data.inviteId, secret: `${accessSecret}.${keySecret}` };
    },
    [status?.enabled],
  );

  const activateEncryptedInvite = useCallback(async (inviteId: string, secret: string) => {
    const masterKey = masterKeyRef.current;
    if (!masterKey || !status?.enabled) {
      throw new Error('Unlock encrypted storage before opening this invitation');
    }
    const [accessSecret, keySecret] = secret.split('.');
    if (!accessSecret || !keySecret || secret.split('.').length !== 2) {
      throw new Error('Invalid encrypted invitation link');
    }
    const response = await fetch(`/api/e2ee/invitations/${encodeURIComponent(inviteId)}`, {
      credentials: 'include',
      headers: {
        'X-Nashm-Encrypted-Invite-Id': inviteId,
        'X-Nashm-Encrypted-Invite-Secret': accessSecret,
      },
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message || 'This invitation is unavailable');
    }
    const data = (await response.json()) as {
      conversationId: string;
      role: 'read' | 'write';
      encryptedConversationKey: EncryptedPayload;
    };
    const conversationKey = await decryptConversationKeyFromInvite(
      data.encryptedConversationKey,
      keySecret,
    );
    await storeConversationKey(data.conversationId, conversationKey, masterKey);
    setActiveEncryptedInvite({
      conversationId: data.conversationId,
      inviteId,
      secret: accessSecret,
      role: data.role,
    });
    return { conversationId: data.conversationId, role: data.role };
  }, [status?.enabled]);

  return useMemo(() => ({
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
    decryptFileInfo,
    protectStoredConversation,
    decryptStoredMessages,
    createEncryptedInvite,
    activateEncryptedInvite,
  }), [
    decryptConvo,
    decryptFile,
    decryptFileInfo,
    decryptMsg,
    decryptStoredMessages,
    createEncryptedInvite,
    activateEncryptedInvite,
    encryptConvo,
    encryptFile,
    encryptMsg,
    error,
    isLoading,
    isUnlocked,
    protectStoredConversation,
    recoverWith12Words,
    setupE2EE,
    status,
    unlockE2EE,
    lockE2EE,
  ]);
}

const disabledE2EE: UseE2EEReturn = {
  isEnabled: false,
  isUnlocked: false,
  isLoading: false,
  error: null,
  status: null,
  setupE2EE: async () => undefined,
  unlockE2EE: async () => false,
  recoverWith12Words: async () => false,
  lockE2EE: () => undefined,
  encryptMsg: async () => null,
  decryptMsg: async () => null,
  encryptConvo: async () => null,
  decryptConvo: async () => null,
  encryptFile: async () => null,
  decryptFile: async () => null,
  decryptFileInfo: async () => null,
  protectStoredConversation: async () => undefined,
  decryptStoredMessages: async (messages) => messages,
  createEncryptedInvite: async () => {
    throw new Error('Encrypted storage is unavailable');
  },
  activateEncryptedInvite: async () => {
    throw new Error('Encrypted storage is unavailable');
  },
};

export function E2EEProvider({ children }: { children: ReactNode }) {
  const value = useE2EEState();
  return createElement(E2EEContext.Provider, { value }, children);
}

export function useE2EE(): UseE2EEReturn {
  return useContext(E2EEContext) ?? disabledE2EE;
}

export default useE2EE;
