/**
 * Nashm Zero-Knowledge Storage Crypto SDK
 * (Encrypted at Rest - Dual-Lock Master Key Architecture)
 *
 * المعمارية:
 *  - يتم توليد True Master Key عشوائي حقيقي (AES-256-GCM) غير مشتق من أي نص.
 *  - يُغلَّف True Master Key بقفلين منفصلين (Dual-Lock):
 *     1. Lock 1: Encryption Passphrase Key (مشتق بـ PBKDF2)
 *     2. Lock 2: 12-Word Recovery Phrase Key (مشتق بـ PBKDF2)
 *  - كِلا المسارين يستعيدان نفس الـ True Master Key بالضبط بايت-بايت!
 */

import { BIP39_ENGLISH_WORDLIST } from './bip39-words';

export const STORAGE_CRYPTO_VERSION = 'zk-v1' as const;
export type StorageCryptoVersion = typeof STORAGE_CRYPTO_VERSION;
export const E2EE_VERSION = STORAGE_CRYPTO_VERSION;
export type E2EEVersion = typeof E2EE_VERSION;

/** حمولة البيانات المشفرة */
export interface EncryptedPayload {
  v: StorageCryptoVersion;
  ct: string; // Base64 ciphertext
  iv: string; // Base64 96-bit IV
}

/** حزمة المفاتيح المغلفة المزدوجه للحساب */
export interface MasterKeyBundle {
  v: StorageCryptoVersion;
  salt: string;
  wrappedKeyPassphrase: EncryptedPayload;
  wrappedKeyRecovery: EncryptedPayload;
}

export interface ExportedKeyBundle {
  v: StorageCryptoVersion;
  keys: Record<string, string>;
  salt: string;
  exportedAt: string;
}

// ─── Wordlist for 12-Word Recovery Phrase (BIP-39 Standard: 2048 Words) ────────
const RECOVERY_WORDS = BIP39_ENGLISH_WORDLIST;

// ─── Private Helpers ────────────────────────────────────────────────────────--

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

// ─── Master Key Generation & Dual-Lock Wrapping ───────────────────────────────

/** توليد True Master Key عشوائي حقيقي */
export async function generateTrueMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
    'wrapKey',
    'unwrapKey',
  ]);
}

/**
 * توليد 12 كلمة استعادة عشوائية باسناد إلى قائمة BIP-39 القياسية (2048 كلمة)
 * 12 كلمة اختيار من 2048 = 2^132 إمكانية (~132-bit entropy)
 * تستخدم CSPRNG (crypto.getRandomValues) حصرية
 */
export function generateRecoveryPhrase(): string[] {
  const phrase: string[] = [];
  const randomIndices = new Uint32Array(12);
  crypto.getRandomValues(randomIndices); // 👈 Cryptographically Secure Pseudo-Random Generator
  for (let i = 0; i < 12; i++) {
    phrase.push(RECOVERY_WORDS[randomIndices[i] % RECOVERY_WORDS.length]);
  }
  return phrase;
}

export function generateSalt(): string {
  return bufToBase64(randomBytes(16));
}

/** اشتقاق مفتاح قفل مشتق من نص صريح (Passphrase أو 12 كلمة) */
export async function deriveLockKey(
  textInput: string,
  salt: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const normalized = textInput.trim().toLowerCase();
  const rawKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(normalized),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuf(salt) as unknown as BufferSource,
      iterations: 600_000,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

// للتوافق مع التسميات القديمة
export const deriveMasterKey = deriveLockKey;

/** تغليف True Master Key باستخدام Lock Key */
export async function wrapMasterKey(
  trueMasterKey: CryptoKey,
  lockKey: CryptoKey,
): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const wrappedBuffer = await crypto.subtle.wrapKey('raw', trueMasterKey, lockKey, {
    name: 'AES-GCM',
    iv: iv as unknown as BufferSource,
  });

  return {
    v: STORAGE_CRYPTO_VERSION,
    ct: bufToBase64(wrappedBuffer),
    iv: bufToBase64(iv),
  };
}

/** فك تغليف واستعادة True Master Key باستخدام Lock Key */
export async function unwrapMasterKey(
  wrappedPayload: EncryptedPayload,
  lockKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuf(wrappedPayload.ct) as unknown as BufferSource,
    lockKey,
    {
      name: 'AES-GCM',
      iv: base64ToBuf(wrappedPayload.iv) as unknown as BufferSource,
    },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

/**
 * حزمة التثبيت الكاملة: توليد True Master Key وتغليفه بالـ Passphrase والـ 12 كلمة
 */
export async function createMasterKeyBundle(
  passphrase: string,
  recoveryPhraseWords: string[],
): Promise<{
  trueMasterKey: CryptoKey;
  bundle: MasterKeyBundle;
}> {
  const salt = generateSalt();
  const trueMasterKey = await generateTrueMasterKey();

  const passphraseLockKey = await deriveLockKey(passphrase, salt);
  const recoveryLockKey = await deriveLockKey(recoveryPhraseWords.join(' '), salt);

  const wrappedKeyPassphrase = await wrapMasterKey(trueMasterKey, passphraseLockKey);
  const wrappedKeyRecovery = await wrapMasterKey(trueMasterKey, recoveryLockKey);

  return {
    trueMasterKey,
    bundle: {
      v: STORAGE_CRYPTO_VERSION,
      salt,
      wrappedKeyPassphrase,
      wrappedKeyRecovery,
    },
  };
}

// ─── Core Encryption / Decryption ─────────────────────────────────────────────

export async function generateConversationKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptText(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const iv = randomBytes(12);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext),
  );

  return {
    v: STORAGE_CRYPTO_VERSION,
    ct: bufToBase64(ciphertext),
    iv: bufToBase64(iv),
  };
}

export async function decryptText(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(payload.iv) as unknown as BufferSource },
    key,
    base64ToBuf(payload.ct) as unknown as BufferSource,
  );
  return dec.decode(plainBuffer);
}

export async function encryptValue(value: unknown, key: CryptoKey): Promise<EncryptedPayload> {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  return encryptText(json, key);
}

export async function decryptValue<T = string>(
  payload: EncryptedPayload,
  key: CryptoKey,
  parseJSON = false,
): Promise<T> {
  const text = await decryptText(payload, key);
  if (parseJSON) {
    return JSON.parse(text) as T;
  }
  return text as unknown as T;
}

export async function wrapConversationKey(
  conversationKey: CryptoKey,
  masterKey: CryptoKey,
): Promise<string> {
  const iv = randomBytes(12);
  const wrapped = await crypto.subtle.wrapKey('raw', conversationKey, masterKey, {
    name: 'AES-GCM',
    iv: iv as unknown as BufferSource,
  });
  const combined = new Uint8Array(iv.length + wrapped.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrapped), iv.length);
  return bufToBase64(combined);
}

export async function unwrapConversationKey(
  wrappedKey: string,
  masterKey: CryptoKey,
): Promise<CryptoKey> {
  const combined = base64ToBuf(wrappedKey);
  const iv = combined.slice(0, 12);
  const wrapped = combined.slice(12);

  return crypto.subtle.unwrapKey(
    'raw',
    wrapped as unknown as BufferSource,
    masterKey,
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'v' in value &&
    'ct' in value &&
    'iv' in value
  );
}

export async function encryptIfNeeded(
  value: string | EncryptedPayload,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  if (isEncryptedPayload(value)) {
    return value;
  }
  return encryptText(value, key);
}

// ─── Chunked File Encryption (AAD Sequence Integrity Protection) ──────────────

export interface EncryptedFileChunk {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  ct: string;
  iv: string;
}

export async function encryptFileChunked(
  fileData: ArrayBuffer,
  fileId: string,
  key: CryptoKey,
  chunkSize = 1024 * 1024,
): Promise<EncryptedFileChunk[]> {
  const totalChunks = Math.ceil(fileData.byteLength / chunkSize);
  const chunks: EncryptedFileChunk[] = [];
  const enc = new TextEncoder();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileData.byteLength);
    const chunkBuffer = fileData.slice(start, end);
    const iv = randomBytes(12);

    const aad = enc.encode(JSON.stringify({ fileId, chunkIndex: i, totalChunks }));

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        additionalData: aad as unknown as BufferSource,
      },
      key,
      chunkBuffer,
    );

    chunks.push({
      fileId,
      chunkIndex: i,
      totalChunks,
      ct: bufToBase64(ciphertext),
      iv: bufToBase64(iv),
    });
  }

  return chunks;
}

export async function decryptFileChunked(
  chunks: EncryptedFileChunk[],
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();

  // 1. التحري الدقيق عن العدد الكلي والمتسلسل
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  if (sorted.length === 0) {
    throw new Error('No file chunks provided');
  }

  const expectedTotal = sorted[0].totalChunks;
  const fileId = sorted[0].fileId;

  // التحقق الصريح: عدد الـ Chunks المستلمة = totalChunks بالضبط
  if (sorted.length !== expectedTotal) {
    throw new Error(`Chunk count mismatch: expected ${expectedTotal}, got ${sorted.length}`);
  }

  // التحقق الصريح: الترتيب من 0 إلى totalChunks - 1 دون نقص أو تكرار
  for (let i = 0; i < expectedTotal; i++) {
    if (sorted[i].chunkIndex !== i) {
      throw new Error(`Chunk sequence error: missing or reordered chunk at index ${i}`);
    }
  }

  const decryptedBuffers: ArrayBuffer[] = [];
  let totalLength = 0;

  for (const chunk of sorted) {
    const aad = enc.encode(JSON.stringify({ fileId, chunkIndex: chunk.chunkIndex, totalChunks: expectedTotal }));
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBuf(chunk.iv) as unknown as BufferSource,
        additionalData: aad as unknown as BufferSource,
      },
      key,
      base64ToBuf(chunk.ct) as unknown as BufferSource,
    );

    decryptedBuffers.push(decrypted);
    totalLength += decrypted.byteLength;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of decryptedBuffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  return result.buffer;
}
