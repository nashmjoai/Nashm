/**
 * Nashm Key Manager
 *
 * إدارة مفاتيح التشفير في IndexedDB على جهاز المستخدم.
 * البيانات لا تغادر الجهاز إلا مشفرة.
 *
 * البنية:
 *  - قاعدة بيانات IndexedDB اسمها "nashm-e2ee-keys"
 *  - جدول "conversation-keys": مفاتيح المحادثات مغلفة بالمفتاح الرئيسي
 *  - جدول "device-keys": مفاتيح خاصة بالجهاز
 */

import {
  generateConversationKey,
  wrapConversationKey,
  unwrapConversationKey,
  type ExportedKeyBundle,
  E2EE_VERSION,
} from './nashm-crypto';

const DB_NAME = 'nashm-e2ee-keys';
const DB_VERSION = 1;
const STORE_CONV_KEYS = 'conversation-keys';
const STORE_DEVICE = 'device-keys';

/** فتح أو إنشاء قاعدة بيانات المفاتيح */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CONV_KEYS)) {
        db.createObjectStore(STORE_CONV_KEYS, { keyPath: 'conversationId' });
      }
      if (!db.objectStoreNames.contains(STORE_DEVICE)) {
        db.createObjectStore(STORE_DEVICE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error(`IndexedDB open failed: ${req.error?.message}`));
  });
}

/** تنفيذ عملية على IndexedDB */
function dbOp<T>(
  storeName: string,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = op(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error(`IndexedDB op failed: ${req.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * حفظ مفتاح محادثة مغلفاً في IndexedDB
 *
 * @param conversationId - معرف المحادثة
 * @param key            - مفتاح AES-256 للمحادثة
 * @param masterKey      - المفتاح الرئيسي لتغليف المفتاح
 */
export async function storeConversationKey(
  conversationId: string,
  key: CryptoKey,
  masterKey: CryptoKey,
): Promise<void> {
  const wrapped = await wrapConversationKey(key, masterKey);
  await dbOp(STORE_CONV_KEYS, 'readwrite', (store) =>
    store.put({ conversationId, wrappedKey: wrapped, createdAt: Date.now() }),
  );
}

/** Returns the locally stored, master-key-wrapped conversation key. */
export async function getWrappedConversationKey(conversationId: string): Promise<string | null> {
  const record = await dbOp<{ conversationId: string; wrappedKey: string } | undefined>(
    STORE_CONV_KEYS,
    'readonly',
    (store) => store.get(conversationId),
  );

  return record?.wrappedKey ?? null;
}

/** Restores a server-held wrapped conversation key into this device's encrypted key store. */
export async function restoreConversationKey(
  conversationId: string,
  wrappedKey: string,
  masterKey: CryptoKey,
): Promise<boolean> {
  try {
    const key = await unwrapConversationKey(wrappedKey, masterKey);
    await storeConversationKey(conversationId, key, masterKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * استرجاع مفتاح محادثة من IndexedDB
 *
 * @param conversationId - معرف المحادثة
 * @param masterKey      - المفتاح الرئيسي لفك التغليف
 * @returns مفتاح المحادثة أو null إذا لم يوجد
 */
export async function getConversationKey(
  conversationId: string,
  masterKey: CryptoKey,
): Promise<CryptoKey | null> {
  const record = await dbOp<{ conversationId: string; wrappedKey: string } | undefined>(
    STORE_CONV_KEYS,
    'readonly',
    (store) => store.get(conversationId),
  );

  if (!record) return null;

  try {
    return await unwrapConversationKey(record.wrappedKey, masterKey);
  } catch {
    // المفتاح الرئيسي خاطئ أو البيانات تالفة
    return null;
  }
}

/**
 * الحصول على مفتاح محادثة - ينشئه إذا لم يكن موجوداً
 *
 * @param conversationId - معرف المحادثة
 * @param masterKey      - المفتاح الرئيسي
 */
export async function getOrCreateConversationKey(
  conversationId: string,
  masterKey: CryptoKey,
): Promise<CryptoKey> {
  const existing = await getConversationKey(conversationId, masterKey);
  if (existing) return existing;

  const newKey = await generateConversationKey();
  await storeConversationKey(conversationId, newKey, masterKey);
  return newKey;
}

/**
 * حذف مفتاح محادثة من IndexedDB
 */
export async function deleteConversationKey(conversationId: string): Promise<void> {
  await dbOp(STORE_CONV_KEYS, 'readwrite', (store) => store.delete(conversationId));
}

/**
 * تصدير جميع مفاتيح المحادثات مغلفة بالمفتاح الرئيسي
 * للمزامنة مع سيرفر Nextcloud
 *
 * @param masterKey - المفتاح الرئيسي
 * @param salt      - Salt المستخدم لاشتقاق المفتاح الرئيسي (محفوظ في MongoDB)
 */
export async function exportKeyBundle(
  masterKey: CryptoKey,
  salt: string,
): Promise<ExportedKeyBundle> {
  const db = await openDB();
  const records: Array<{ conversationId: string; wrappedKey: string }> = await new Promise(
    (resolve, reject) => {
      const tx = db.transaction(STORE_CONV_KEYS, 'readonly');
      const req = tx.objectStore(STORE_CONV_KEYS).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    },
  );

  // إعادة تغليف كل مفتاح بالمفتاح الرئيسي (مغلف بالفعل، نرسله مباشرة)
  const keys: Record<string, string> = {};
  for (const rec of records) {
    // فك التغليف ثم إعادة التغليف بنفس المفتاح (للتأكد من صلاحيته)
    try {
      const convKey = await unwrapConversationKey(rec.wrappedKey, masterKey);
      keys[rec.conversationId] = await wrapConversationKey(convKey, masterKey);
    } catch {
      // تجاهل المفاتيح التالفة
    }
  }

  return {
    v: E2EE_VERSION,
    keys,
    salt,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * استيراد حزمة مفاتيح من المزامنة وتخزينها محلياً
 *
 * @param bundle    - حزمة المفاتيح من سيرفر Nextcloud
 * @param masterKey - المفتاح الرئيسي لفك تغليف المفاتيح
 */
export async function importKeyBundle(
  bundle: ExportedKeyBundle,
  masterKey: CryptoKey,
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (const [conversationId, wrappedKey] of Object.entries(bundle.keys)) {
    try {
      const convKey = await unwrapConversationKey(wrappedKey as string, masterKey);
      await storeConversationKey(conversationId, convKey, masterKey);
      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, failed };
}

/**
 * مسح جميع المفاتيح من IndexedDB (عند تسجيل الخروج أو إعادة التعيين)
 * تحذير: هذا لا يمكن التراجع عنه!
 */
export async function clearAllKeys(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_CONV_KEYS, STORE_DEVICE], 'readwrite');
  tx.objectStore(STORE_CONV_KEYS).clear();
  tx.objectStore(STORE_DEVICE).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * التحقق إذا كانت قاعدة بيانات المفاتيح تحتوي على أي مفاتيح
 */
export async function hasStoredKeys(): Promise<boolean> {
  const count = await dbOp<number>(STORE_CONV_KEYS, 'readonly', (store) => store.count());
  return count > 0;
}
