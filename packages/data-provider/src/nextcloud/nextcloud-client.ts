/**
 * Nextcloud WebDAV Client
 *
 * واجهة برمجية للتواصل مع سيرفر Nextcloud الخاص عبر بروتوكول WebDAV.
 * يستخدم HTTP Basic Auth مع App Token المشفر.
 *
 * المرجع: https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/
 */

/** نتيجة فحص السيرفر */
export interface NextcloudServerStatus {
  installed: boolean;
  version: string;
  versionstring: string;
  edition: string;
  productname: string;
  maintenance: boolean;
}

/** نتيجة تسجيل الدخول عبر Login Flow v2 */
export interface NextcloudAuthResult {
  username: string;
  appToken: string;
}

/** معلومات ملف على السيرفر */
export interface NextcloudFileInfo {
  path: string;
  etag: string;
  contentLength: number;
  lastModified: string;
}

/**
 * عميل WebDAV لسيرفر Nextcloud
 */
export class NextcloudWebDAVClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly token: string;
  private readonly syncFolder: string;
  private readonly authHeader: string;

  constructor(opts: {
    serverUrl: string;
    username: string;
    token: string;
    syncFolder?: string;
  }) {
    this.baseUrl = opts.serverUrl.replace(/\/$/, '');
    this.username = opts.username;
    this.token = opts.token;
    this.syncFolder = opts.syncFolder ?? '/Nashm-E2EE';
    this.authHeader = 'Basic ' + btoa(`${this.username}:${this.token}`);
  }

  /** مسار WebDAV الكامل لمجلد المزامنة */
  private davPath(relativePath = ''): string {
    const encoded = relativePath
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/');
    return `${this.baseUrl}/remote.php/dav/files/${this.username}${this.syncFolder}${encoded}`;
  }

  /** Headers مشتركة لجميع الطلبات */
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'OCS-APIREQUEST': 'true',
      ...extra,
    };
  }

  /**
   * فحص حالة سيرفر Nextcloud
   * @param serverUrl - رابط السيرفر
   */
  static async checkServer(serverUrl: string): Promise<NextcloudServerStatus> {
    const url = serverUrl.replace(/\/$/, '') + '/status.php';
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`Server unreachable: HTTP ${res.status}`);
    }

    const data = (await res.json()) as NextcloudServerStatus;
    if (!data.installed) {
      throw new Error('Nextcloud is not installed on this server');
    }
    return data;
  }

  /**
   * إنشاء مجلد المزامنة إذا لم يكن موجوداً
   */
  async ensureSyncFolderExists(): Promise<void> {
    const url = this.davPath();
    const res = await fetch(url, {
      method: 'MKCOL',
      headers: this.headers(),
    });

    // 201 = أُنشئ، 405 = موجود مسبقاً (كلاهما نجاح)
    if (res.status !== 201 && res.status !== 405) {
      throw new Error(`Failed to create sync folder: HTTP ${res.status}`);
    }
  }

  /**
   * رفع ملف مشفر إلى سيرفر Nextcloud
   *
   * @param filename    - اسم الملف داخل مجلد المزامنة
   * @param content     - محتوى الملف (JSON string)
   */
  async uploadFile(filename: string, content: string): Promise<void> {
    await this.ensureSyncFolderExists();

    const url = this.davPath('/' + filename);
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json; charset=utf-8' }),
      body: content,
    });

    if (!res.ok) {
      throw new Error(`Upload failed for "${filename}": HTTP ${res.status}`);
    }
  }

  /**
   * تحميل محتوى ملف من سيرفر Nextcloud
   *
   * @param filename - اسم الملف
   * @returns محتوى الملف كـ string، أو null إذا لم يوجد
   */
  async downloadFile(filename: string): Promise<string | null> {
    const url = this.davPath('/' + filename);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.headers(),
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Download failed for "${filename}": HTTP ${res.status}`);

    return res.text();
  }

  /**
   * قائمة الملفات في مجلد المزامنة
   */
  async listFiles(): Promise<NextcloudFileInfo[]> {
    const url = this.davPath();
    const body = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getcontentlength/>
    <d:getetag/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`;

    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: this.headers({
        'Content-Type': 'application/xml',
        Depth: '1',
      }),
      body,
    });

    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`List files failed: HTTP ${res.status}`);

    const xml = await res.text();
    return parseWebDAVResponse(xml);
  }

  /**
   * حذف ملف من سيرفر Nextcloud
   */
  async deleteFile(filename: string): Promise<void> {
    const url = this.davPath('/' + filename);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (res.status !== 204 && res.status !== 404) {
      throw new Error(`Delete failed for "${filename}": HTTP ${res.status}`);
    }
  }
}

/** تحليل استجابة PROPFIND */
function parseWebDAVResponse(xml: string): NextcloudFileInfo[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const responses = Array.from(doc.querySelectorAll('response'));
  const files: NextcloudFileInfo[] = [];

  for (const response of responses) {
    const hrefEl = response.querySelector('href');
    const etagEl = response.querySelector('getetag');
    const lengthEl = response.querySelector('getcontentlength');
    const modifiedEl = response.querySelector('getlastmodified');

    if (!hrefEl?.textContent) continue;

    const path = decodeURIComponent(hrefEl.textContent);

    // تجاهل المجلد نفسه
    if (path.endsWith('/')) continue;

    files.push({
      path,
      etag: etagEl?.textContent?.replace(/"/g, '') ?? '',
      contentLength: parseInt(lengthEl?.textContent ?? '0', 10),
      lastModified: modifiedEl?.textContent ?? '',
    });
  }

  return files;
}
