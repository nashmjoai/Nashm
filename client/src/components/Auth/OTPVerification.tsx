import React, { useRef, useState, useEffect } from 'react';
import { Button, Spinner } from '@nashm/client';
import { useLocalize } from '~/hooks';

interface OTPVerificationProps {
  onVerify: (otp: string) => void;
  onResend: () => void;
  isLoading: boolean;
  error?: string;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  onVerify,
  onResend,
  isLoading,
  error,
}) => {
  const localize = useLocalize();
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [timer, setTimer] = useState<number>(60);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(countdown);
    }
    return undefined;
  }, [timer]);

  const handleChange = (value: string, index: number) => {
    if (isNaN(Number(value))) {
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Call verify if all filled
    const completedOtp = newOtp.join('');
    if (completedOtp.length === 6) {
      onVerify(completedOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text');
    if (!/^\d{6}$/.test(data)) {
      return;
    }

    const newOtp = data.split('');
    setOtp(newOtp);
    onVerify(data);
  };

  const handleResendClick = () => {
    if (timer === 0) {
      onResend();
      setTimer(60);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="text-center">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          {localize('com_auth_otp_instructions' as any) || 'Enter the 6-digit verification code sent to your email.'}
        </p>
      </div>

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {otp.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit}
            ref={(el) => (inputsRef.current[idx] = el)}
            onChange={(e) => handleChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className="w-10 h-12 text-center text-xl font-bold border border-border-light rounded-xl bg-surface-primary text-text-primary focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
          />
        ))}
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
      )}

      <div className="w-full flex flex-col space-y-4">
        <Button
          onClick={() => onVerify(otp.join(''))}
          disabled={otp.join('').length !== 6 || isLoading}
          variant="submit"
          className="h-12 w-full rounded-2xl"
        >
          {isLoading ? <Spinner /> : localize('com_auth_continue')}
        </Button>

        <div className="text-center">
          {timer > 0 ? (
            <span className="text-xs text-text-tertiary">
              {localize('com_auth_otp_resend_in' as any) || 'Resend code in'} {timer}s
            </span>
          ) : (
            <button
              onClick={handleResendClick}
              className="text-xs font-semibold text-green-600 hover:underline dark:text-green-400"
            >
              {localize('com_auth_otp_resend' as any) || 'Resend Code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
