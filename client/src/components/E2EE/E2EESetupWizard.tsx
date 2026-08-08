/**
 * Zero-Knowledge Storage Setup & Recovery Wizard
 *
 * المعمارية الحقيقية:
 *  - إنشاء True Master Key وتغليفه بالـ Passphrase والـ 12 كلمة لحفظ الأقفال في السيرفر.
 *  - يتيح الاسترجاع التام في حال مسح المتصفح بإدخال الـ 12 كلمة لفك تغليف True Master Key.
 */

import React, { useState, useCallback } from 'react';
import { Shield, Lock, KeyRound, CheckCircle2, AlertTriangle, Loader2, X, Copy, RefreshCw } from 'lucide-react';
import { generateRecoveryPhrase } from 'nashm-data-provider';

interface SetupWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
  onCompleteSetup: (passphrase: string, recoveryPhrase: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function ZeroKnowledgeSetupWizard({
  onClose,
  onSuccess,
  onCompleteSetup,
  isLoading,
  error,
}: SetupWizardProps) {
  const [step, setStep] = useState<'intro' | 'passphrase' | 'recovery' | 'confirm' | 'success'>('intro');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [userConfirmWords, setUserConfirmWords] = useState<string[]>(['', '', '']);
  const [checkIndices, setCheckIndices] = useState<number[]>([1, 5, 10]);
  const [copied, setCopied] = useState(false);

  const handleStartPassphrase = () => {
    setStep('passphrase');
  };

  const handlePassphraseNext = () => {
    if (passphrase.length >= 8 && passphrase === confirmPass) {
      const words = generateRecoveryPhrase();
      setRecoveryWords(words);
      setCheckIndices([1, 5, 10]);
      setStep('recovery');
    }
  };

  const handleCopyWords = () => {
    navigator.clipboard.writeText(recoveryWords.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinalSubmit = async () => {
    await onCompleteSetup(passphrase, recoveryWords);
    setStep('success');
    onSuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-lg rounded-2xl border border-token-border-light bg-token-surface-primary p-6 shadow-2xl"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-1.5 text-token-text-secondary hover:bg-token-surface-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {['intro', 'passphrase', 'recovery', 'confirm', 'success'].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s ? 'w-6 bg-violet-600' : 'w-2 bg-token-border-medium'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Intro */}
        {step === 'intro' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 shadow-md">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-token-text-primary">
                تفعيل تشفير البيانات (Encrypted at Rest)
              </h2>
              <p className="mt-1 text-xs text-token-text-secondary">
                حماية محادثاتك المخزنة في قاعدة البيانات بشرط الشفافية والأمان الكامل
              </p>
            </div>

            <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-right dark:border-blue-900/40 dark:bg-blue-950/20">
              <p className="text-xs leading-relaxed text-blue-900 dark:text-blue-300">
                ℹ️ <strong>شفافية مستوى الحماية:</strong> بياناتك مشفرة في قاعدة البيانات (Zero-Knowledge Storage)، ولا تُقرأ إلا وقت المعالجة الفعلية لإرسالها للذكاء الاصطناعي عبر اتصال مشفّر (HTTPS).
              </p>
            </div>

            <div className="space-y-2 text-right text-xs text-token-text-secondary">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                كلمة سر التشفير منفصلة تماماً عن كلمة سر تسجيل الدخول.
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                سيُطلب منك حفظ 12 كلمة استعادة (Recovery Phrase) إجبارياً.
              </p>
            </div>

            <button
              onClick={handleStartPassphrase}
              className="mt-2 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              متابعة الإعداد
            </button>
          </div>
        )}

        {/* Step 2: Encryption Passphrase */}
        {step === 'passphrase' && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-token-text-primary">
                تعيين Encryption Passphrase
              </h2>
              <p className="text-xs text-token-text-secondary">
                كلمة السر هذه خاصة بالتشفير فقط ولا يتم إرسالها للسيرفر أبداً
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-token-text-primary">
                كلمة سر التشفير (Passphrase)
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="8 أحرف على الأقل..."
                className="w-full rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2.5 text-sm text-token-text-primary focus:border-violet-400 focus:outline-none"
                dir="ltr"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-token-text-primary">
                تأكيد كلمة سر التشفير
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="أعد إدخال كلمة السر..."
                className="w-full rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2.5 text-sm text-token-text-primary focus:border-violet-400 focus:outline-none"
                dir="ltr"
              />
            </div>

            {passphrase.length > 0 && passphrase !== confirmPass && (
              <p className="text-xs text-red-500">كلمتا السر غير متطابقتين</p>
            )}

            <button
              onClick={handlePassphraseNext}
              disabled={passphrase.length < 8 || passphrase !== confirmPass}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              التالي: كلمات الاستعادة (Recovery Phrase)
            </button>
          </div>
        )}

        {/* Step 3: Recovery Phrase (12 Words) */}
        {step === 'recovery' && (
          <div className="flex flex-col gap-4 text-center">
            <div>
              <h2 className="text-lg font-bold text-token-text-primary">
                احفظ 12 كلمة استعادة (Recovery Phrase)
              </h2>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                ⚠️ إجباري: احفظ الكلمات في مكان آمن. هذه الكلمات هي الوسيلة الوحيدة لاستعادة محادثاتك لو تم مسح المتصفح.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-token-border-light bg-token-surface-secondary p-3" dir="ltr">
              {recoveryWords.map((word, idx) => (
                <div key={idx} className="flex items-center gap-1.5 rounded-lg bg-token-surface-primary p-2 text-xs font-mono">
                  <span className="text-token-text-tertiary">{idx + 1}.</span>
                  <span className="font-semibold text-token-text-primary">{word}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleCopyWords}
              className="flex items-center justify-center gap-2 rounded-lg border border-token-border-light py-2 text-xs font-medium text-token-text-secondary hover:bg-token-surface-secondary"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'تم النسخ!' : 'نسخ الكلمات الـ 12'}
            </button>

            <button
              onClick={() => setStep('confirm')}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              حفظت الكلمات، متابعة للتأكيد
            </button>
          </div>
        )}

        {/* Step 4: Confirm Recovery Words */}
        {step === 'confirm' && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-token-text-primary">
                تأكيد كلمات الاستعادة
              </h2>
              <p className="text-xs text-token-text-secondary">
                أدخل الكلمات المطلوبة للتأكد من أنك قمت بحفظها بشكل صحيح:
              </p>
            </div>

            {checkIndices.map((wordIdx, i) => (
              <div key={wordIdx}>
                <label className="mb-1 block text-xs font-medium text-token-text-primary">
                  الكلمة رقم #{wordIdx + 1}
                </label>
                <input
                  type="text"
                  value={userConfirmWords[i]}
                  onChange={(e) => {
                    const newArr = [...userConfirmWords];
                    newArr[i] = e.target.value.trim().toLowerCase();
                    setUserConfirmWords(newArr);
                  }}
                  className="w-full rounded-xl border border-token-border-light bg-token-surface-primary px-3 py-2 text-sm text-token-text-primary focus:border-violet-400 focus:outline-none"
                  dir="ltr"
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              onClick={handleFinalSubmit}
              disabled={
                isLoading ||
                checkIndices.some((wordIdx, i) => userConfirmWords[i] !== recoveryWords[wordIdx])
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إتمام وتفعيل التشفير'}
            </button>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-md">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-token-text-primary">
                تم تفعيل تشفير البيانات بنجاح! 🎉
              </h2>
              <p className="mt-1 text-xs text-token-text-secondary">
                محادثاتك القادمة ستُحفظ مشفرة في قاعدة البيانات (Zero-Knowledge Storage).
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              بدء الاستخدام
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * نافذة استعادة المفاتيح بـ 12 كلمة (عند مسح المتصفح أو الدخول من جهاز جديد)
 */
export function RecoveryModal({
  onClose,
  onRecover,
  isLoading,
  error,
}: {
  onClose: () => void;
  onRecover: (words: string[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}) {
  const [inputWords, setInputWords] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const words = inputWords
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length === 12) {
      await onRecover(words);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border border-token-border-light bg-token-surface-primary p-6 shadow-2xl"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-1.5 text-token-text-secondary hover:bg-token-surface-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 mx-auto">
            <KeyRound className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-token-text-primary">
              استعادة الوصول بكلمات الاستعادة
            </h2>
            <p className="text-xs text-token-text-secondary mt-1">
              أدخل الكلمات الـ 12 التي حفظتها أثناء الإعداد (مفصولة بمسافة):
            </p>
          </div>

          <textarea
            value={inputWords}
            onChange={(e) => setInputWords(e.target.value)}
            rows={3}
            placeholder="word1 word2 word3 ... word12"
            className="w-full rounded-xl border border-token-border-light bg-token-surface-primary p-3 font-mono text-xs text-token-text-primary focus:border-violet-400 focus:outline-none"
            dir="ltr"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || inputWords.trim().split(/\s+/).length !== 12}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'استعادة التشفير'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ZeroKnowledgeSetupWizard;
