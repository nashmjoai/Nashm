/**
 * Nashm ↔ Nextcloud Sync
 *
 * مزامنة المحادثات المشفرة وحزم المفاتيح مع سيرفر Nextcloud الخاص.
 *
 * هيكل المجلدات على السيرفر:
 *  /Nashm-E2EE/
 *  ├── keys.json.enc          ← حزمة مفاتيح المحادثات (مشفرة بالمفتاح الرئيسي)
 *  └── convos/
 *      ├── {conversationId}.json.enc  ← بيانات كل محادثة مشفرة
 *      └── ...
 */

import { NextcloudWebDAVClient, type NextcloudServerStatus } from './nextcloud-client';
import { exportKeyBundle, importKeyBundle } from '../crypto/key-manager';
import type { ExportedKeyBundle } from '../crypto/nashm-crypto';

const KEYS_FILE = 'keys.json.enc';
const CONVOS_FOLDER = 'convos/';

/** خيارات المزامنة */
export interface SyncOptions {
  serverUrl: string;
  username: string;
  /** App Token النص الصريح (قبل التشفير) */
  appToken: string;
  syncFolder?: string;
}

/** نتيجة عملية المزامنة */
export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  keysImported: number;
  errors: string[];
  syncedAt: string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * فحص سيرفر Nextcloud والتحقق من صحة الاتصال
 */
export async function verifyNextcloudServer(serverUrl: string): Promise<NextcloudServerStatus> {
  return NextcloudWebDAVClient.checkServer(serverUrl);
}

/**
 * رفع حزمة المفاتيح المشفرة إلى سيرفر Nextcloud
 *
 * @param opts       - إعدادات الاتصال
 * @param masterKey  - المفتاح الرئيسي للمستخدم
 * @param salt       - Salt المستخدم لاشتقاق المفتاح الرئيسي
 */
export async function uploadKeyBundle(
  opts: SyncOptions,
  masterKey: CryptoKey,
  salt: string,
): Promise<void> {
  const client = new NextcloudWebDAVClient({
    serverUrl: opts.serverUrl,
    username: opts.username,
    token: opts.appToken,
    syncFolder: opts.syncFolder,
  });
  const bundle = await exportKeyBundle(masterKey, salt);
  await client.uploadFile(KEYS_FILE, JSON.stringify(bundle));
}

/**
 * تحميل حزمة المفاتيح من سيرفر Nextcloud وتخزينها محلياً
 *
 * @param opts       - إعدادات الاتصال
 * @param masterKey  - المفتاح الرئيسي للمستخدم
 * @returns عدد المفاتيح المُستوردة
 */
export async function downloadAndImportKeyBundle(
  opts: SyncOptions,
  masterKey: CryptoKey,
): Promise<{ imported: number; failed: number }> {
  const client = new NextcloudWebDAVClient({
    serverUrl: opts.serverUrl,
    username: opts.username,
    token: opts.appToken,
    syncFolder: opts.syncFolder,
  });
  const content = await client.downloadFile(KEYS_FILE);

  if (!content) {
    return { imported: 0, failed: 0 };
  }

  const bundle = JSON.parse(content) as ExportedKeyBundle;
  return importKeyBundle(bundle, masterKey);
}

/**
 * رفع بيانات محادثة مشفرة إلى سيرفر Nextcloud
 *
 * @param opts           - إعدادات الاتصال
 * @param conversationId - معرف المحادثة
 * @param encryptedData  - بيانات المحادثة المشفرة (من الـ API)
 */
export async function uploadConversation(
  opts: SyncOptions,
  conversationId: string,
  encryptedData: unknown,
): Promise<void> {
  const client = new NextcloudWebDAVClient({
    serverUrl: opts.serverUrl,
    username: opts.username,
    token: opts.appToken,
    syncFolder: opts.syncFolder,
  });
  const filename = `${CONVOS_FOLDER}${conversationId}.json.enc`;
  await client.uploadFile(filename, JSON.stringify(encryptedData));
}

/**
 * تحميل بيانات محادثة مشفرة من سيرفر Nextcloud
 *
 * @param opts           - إعدادات الاتصال
 * @param conversationId - معرف المحادثة
 */
export async function downloadConversation(
  opts: SyncOptions,
  conversationId: string,
): Promise<unknown | null> {
  const client = new NextcloudWebDAVClient({
    serverUrl: opts.serverUrl,
    username: opts.username,
    token: opts.appToken,
    syncFolder: opts.syncFolder,
  });
  const filename = `${CONVOS_FOLDER}${conversationId}.json.enc`;
  const content = await client.downloadFile(filename);
  if (!content) return null;
  return JSON.parse(content);
}

/**
 * مزامنة كاملة: رفع المفاتيح وجميع المحادثات المشفرة
 *
 * @param opts                 - إعدادات الاتصال
 * @param masterKey            - المفتاح الرئيسي للمستخدم
 * @param salt                 - Salt لاشتقاق المفتاح الرئيسي
 * @param encryptedConversations - قائمة المحادثات المشفرة
 */
export async function fullSync(
  opts: SyncOptions,
  masterKey: CryptoKey,
  salt: string,
  encryptedConversations: Array<{ id: string; data: unknown }>,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    uploaded: 0,
    downloaded: 0,
    keysImported: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  };

  try {
    // 1. رفع حزمة المفاتيح
    await uploadKeyBundle(opts, masterKey, salt);

    // 2. رفع المحادثات المشفرة
    for (const convo of encryptedConversations) {
      try {
        await uploadConversation(opts, convo.id, convo.data);
        result.uploaded++;
      } catch (err) {
        result.errors.push(`فشل رفع محادثة ${convo.id}: ${(err as Error).message}`);
      }
    }

    result.success = true;
  } catch (err) {
    result.errors.push((err as Error).message);
  }

  return result;
}

/**
 * استيراد جميع البيانات من سيرفر Nextcloud (عند تسجيل الدخول على جهاز جديد)
 *
 * @param opts      - إعدادات الاتصال
 * @param masterKey - المفتاح الرئيسي للمستخدم
 */
export async function importFromNextcloud(
  opts: SyncOptions,
  masterKey: CryptoKey,
): Promise<{
  keysImported: number;
  keysFailed: number;
  conversationsFound: number;
}> {
  const client = new NextcloudWebDAVClient({
    serverUrl: opts.serverUrl,
    username: opts.username,
    token: opts.appToken,
    syncFolder: opts.syncFolder,
  });

  // 1. استيراد حزمة المفاتيح
  const keyResult = await downloadAndImportKeyBundle(opts, masterKey);

  // 2. قائمة محادثات متاحة على السيرفر
  const files = await client.listFiles();
  const conversationFiles = files.filter((f) => f.path.includes(CONVOS_FOLDER));

  return {
    keysImported: keyResult.imported,
    keysFailed: keyResult.failed,
    conversationsFound: conversationFiles.length,
  };
}
