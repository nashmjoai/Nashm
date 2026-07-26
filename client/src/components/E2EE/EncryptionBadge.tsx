/**
 * EncryptionBadge & KeyRecoveryAlert
 *
 * شارات التشفير وتنبيهات استعادة المفاتيح في حال تم مسح IndexedDB.
 */

import React from 'react';
import { Lock, LockOpen, ShieldCheck, AlertTriangle, KeyRound } from 'lucide-react';

export type EncryptionBadgeVariant = 'icon' | 'pill' | 'full';
export type EncryptionBadgeSize = 'sm' | 'md' | 'lg';

interface EncryptionBadgeProps {
  isEncrypted: boolean;
  isUnlocked?: boolean;
  variant?: EncryptionBadgeVariant;
  size?: EncryptionBadgeSize;
  title?: string;
  className?: string;
}

const sizeMap = {
  sm: { icon: 'h-3 w-3', pill: 'px-1.5 py-0.5 text-[10px]' },
  md: { icon: 'h-4 w-4', pill: 'px-2 py-1 text-xs' },
  lg: { icon: 'h-5 w-5', pill: 'px-2.5 py-1.5 text-sm' },
};

export function EncryptionBadge({
  isEncrypted,
  isUnlocked = false,
  variant = 'icon',
  size = 'sm',
  title,
  className = '',
}: EncryptionBadgeProps) {
  if (!isEncrypted) return null;

  const iconSize = sizeMap[size].icon;
  const pillSize = sizeMap[size].pill;

  const defaultTitle =
    title ?? (isUnlocked ? 'بيانات مشفرة عند السكون (Encrypted at Rest)' : 'بيانات مشفرة');

  if (variant === 'icon') {
    return (
      <span title={defaultTitle} className={`inline-flex shrink-0 text-violet-500 ${className}`}>
        <Lock className={iconSize} />
      </span>
    );
  }

  if (variant === 'pill') {
    return (
      <span
        title={defaultTitle}
        className={`inline-flex items-center gap-1 rounded-full font-medium ${pillSize} ${
          isUnlocked
            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        } ${className}`}
      >
        <Lock className={iconSize} />
        {isUnlocked ? 'مشفر في DB' : 'مقفل'}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-900/20 ${className}`}
    >
      <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      <div>
        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
          تشفير التخزين (Encrypted at Rest)
        </p>
        <p className="text-[10px] text-violet-600 dark:text-violet-500">
          {isUnlocked ? 'مفتاح التشفير نشط' : 'أدخل كلمة سر التشفير أو 12 كلمة لفتح البيانات'}
        </p>
      </div>
    </div>
  );
}

/**
 * شريط تنبيه الاستعادة عند مسح IndexedDB أو فقدان المفتاح
 */
export function KeyRecoveryAlert({
  onRestoreClick,
}: {
  onRestoreClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-right dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            مفتاح التشفير غير موجود في المتصفح!
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            قد يكون تم مسح ذاكرة المتصفح. أدخل الـ Passphrase أو الـ 12 كلمة لاستعادة الوصول لمحادثاتك.
          </p>
        </div>
      </div>
      <button
        onClick={onRestoreClick}
        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
      >
        <KeyRound className="h-3.5 w-3.5" />
        استعادة المفاتيح
      </button>
    </div>
  );
}

export default EncryptionBadge;
