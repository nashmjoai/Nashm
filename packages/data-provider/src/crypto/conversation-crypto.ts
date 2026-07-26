/**
 * Nashm Conversation Crypto
 *
 * تشفير وفك تشفير بيانات المحادثات والرسائل
 * طبقة وسيطة بين واجهة المستخدم ومحرك التشفير
 */

import {
  encryptText,
  decryptText,
  encryptValue,
  decryptValue,
  isEncryptedPayload,
  type EncryptedPayload,
} from './nashm-crypto';

import { getOrCreateConversationKey, getConversationKey } from './key-manager';

// ─── Types ───────────────────────────────────────────────────────────────────

/** الحقول المشفرة في الرسالة */
export interface EncryptedMessageFields {
  /** المحتوى النصي مشفر */
  text?: EncryptedPayload;
  /** ملخص الرسالة مشفر */
  summary?: EncryptedPayload;
  /** إشارة للتشفير */
  isEncrypted: boolean;
}

/** الحقول المشفرة في المحادثة */
export interface EncryptedConvoFields {
  /** عنوان المحادثة مشفر */
  title?: EncryptedPayload;
  /** إشارة للتشفير */
  isEncrypted: boolean;
}

// ─── Message Encryption ──────────────────────────────────────────────────────

/**
 * تشفير حقول الرسالة قبل الإرسال للسيرفر
 *
 * @param conversationId - معرف المحادثة (لاسترجاع مفتاحها)
 * @param masterKey      - المفتاح الرئيسي للمستخدم
 * @param fields         - الحقول المراد تشفيرها
 */
export async function encryptMessage(
  conversationId: string,
  masterKey: CryptoKey,
  fields: {
    text?: string;
    summary?: string;
    content?: unknown[];
  },
): Promise<EncryptedMessageFields & { content?: EncryptedPayload }> {
  const key = await getOrCreateConversationKey(conversationId, masterKey);
  const result: EncryptedMessageFields & { content?: EncryptedPayload } = {
    isEncrypted: true,
  };

  if (fields.text !== undefined && fields.text !== '') {
    result.text = await encryptText(fields.text, key);
  }

  if (fields.summary !== undefined && fields.summary !== '') {
    result.summary = await encryptText(fields.summary, key);
  }

  if (fields.content !== undefined && fields.content.length > 0) {
    result.content = await encryptValue(fields.content, key);
  }

  return result;
}

/**
 * فك تشفير حقول الرسالة بعد الاستلام من السيرفر
 *
 * @param conversationId - معرف المحادثة
 * @param masterKey      - المفتاح الرئيسي للمستخدم
 * @param fields         - الحقول المشفرة
 */
export async function decryptMessage(
  conversationId: string,
  masterKey: CryptoKey,
  fields: {
    text?: EncryptedPayload | string;
    summary?: EncryptedPayload | string;
    content?: EncryptedPayload | unknown[];
    isEncrypted?: boolean;
  },
): Promise<{ text?: string; summary?: string; content?: unknown[] }> {
  // إذا لم تكن الرسالة مشفرة نعيدها كما هي
  if (!fields.isEncrypted) {
    return {
      text: typeof fields.text === 'string' ? fields.text : undefined,
      summary: typeof fields.summary === 'string' ? fields.summary : undefined,
      content: Array.isArray(fields.content) ? fields.content : undefined,
    };
  }

  const key = await getConversationKey(conversationId, masterKey);
  if (!key) {
    // لا يوجد مفتاح - نعيد رسالة خطأ بدلاً من crash
    return {
      text: '[🔐 لا يمكن فك التشفير - المفتاح غير موجود على هذا الجهاز]',
    };
  }

  const result: { text?: string; summary?: string; content?: unknown[] } = {};

  if (fields.text && isEncryptedPayload(fields.text)) {
    result.text = await decryptText(fields.text, key);
  } else if (typeof fields.text === 'string') {
    result.text = fields.text;
  }

  if (fields.summary && isEncryptedPayload(fields.summary)) {
    result.summary = await decryptText(fields.summary, key);
  } else if (typeof fields.summary === 'string') {
    result.summary = fields.summary;
  }

  if (fields.content && isEncryptedPayload(fields.content)) {
    result.content = await decryptValue<unknown[]>(fields.content, key, true);
  } else if (Array.isArray(fields.content)) {
    result.content = fields.content;
  }

  return result;
}

// ─── Conversation Encryption ─────────────────────────────────────────────────

/**
 * تشفير حقول المحادثة
 */
export async function encryptConversation(
  conversationId: string,
  masterKey: CryptoKey,
  fields: { title?: string },
): Promise<EncryptedConvoFields> {
  const key = await getOrCreateConversationKey(conversationId, masterKey);
  const result: EncryptedConvoFields = { isEncrypted: true };

  if (fields.title !== undefined && fields.title !== '') {
    result.title = await encryptText(fields.title, key);
  }

  return result;
}

/**
 * فك تشفير حقول المحادثة
 */
export async function decryptConversation(
  conversationId: string,
  masterKey: CryptoKey,
  fields: { title?: EncryptedPayload | string; isEncrypted?: boolean },
): Promise<{ title?: string }> {
  if (!fields.isEncrypted) {
    return { title: typeof fields.title === 'string' ? fields.title : undefined };
  }

  const key = await getConversationKey(conversationId, masterKey);
  if (!key) {
    return { title: '[🔐 محادثة مشفرة]' };
  }

  const result: { title?: string } = {};

  if (fields.title && isEncryptedPayload(fields.title)) {
    result.title = await decryptText(fields.title, key);
  } else if (typeof fields.title === 'string') {
    result.title = fields.title;
  }

  return result;
}

/**
 * فك تشفير قائمة من المحادثات دفعةً واحدة
 */
export async function decryptConversationBatch(
  conversations: Array<{
    conversationId: string;
    title?: EncryptedPayload | string;
    isEncrypted?: boolean;
  }>,
  masterKey: CryptoKey,
): Promise<Array<{ conversationId: string; title?: string }>> {
  return Promise.all(
    conversations.map(async (convo) => {
      const decrypted = await decryptConversation(convo.conversationId, masterKey, {
        title: convo.title,
        isEncrypted: convo.isEncrypted,
      });
      return { conversationId: convo.conversationId, ...decrypted };
    }),
  );
}
