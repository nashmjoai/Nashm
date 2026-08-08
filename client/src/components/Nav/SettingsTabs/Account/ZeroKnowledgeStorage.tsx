import React, { useCallback, useState } from 'react';
import { Button, Label, Spinner, useToastContext } from '@nashm/client';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { RecoveryModal, ZeroKnowledgeSetupWizard } from '~/components/E2EE';
import { useLocalize } from '~/hooks';
import useE2EE from '~/hooks/useE2EE';

const ZeroKnowledgeStorage = () => {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const {
    error,
    isEnabled,
    isLoading,
    isUnlocked,
    lockE2EE,
    recoverWith12Words,
    setupE2EE,
    unlockE2EE,
  } = useE2EE();
  const [passphrase, setPassphrase] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = useCallback(async () => {
    if (!passphrase) {
      return;
    }

    setIsUnlocking(true);
    const unlocked = await unlockE2EE(passphrase);
    setIsUnlocking(false);
    if (unlocked) {
      setPassphrase('');
      showToast({ message: localize('com_ui_zero_knowledge_unlocked') });
      return;
    }
    showToast({ message: localize('com_ui_zero_knowledge_unlock_error'), status: 'error' });
  }, [localize, passphrase, showToast, unlockE2EE]);

  const handleRecovery = useCallback(
    async (words: string[]) => {
      const unlocked = await recoverWith12Words(words);
      if (!unlocked) {
        showToast({ message: localize('com_ui_zero_knowledge_recovery_error'), status: 'error' });
        return;
      }
      setShowRecovery(false);
      showToast({ message: localize('com_ui_zero_knowledge_unlocked') });
    },
    [localize, recoverWith12Words, showToast],
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Label id="zero-knowledge-storage-label" className="flex items-center gap-2">
            {isUnlocked ? (
              <ShieldCheck className="icon-sm text-green-600" aria-hidden="true" />
            ) : (
              <LockKeyhole className="icon-sm" aria-hidden="true" />
            )}
            {localize('com_ui_settings_label_zero_knowledge_storage')}
          </Label>
          <p className="mt-1 text-xs text-text-secondary">
            {localize('com_ui_zero_knowledge_description')}
          </p>
        </div>

        {!isEnabled ? (
          <Button
            onClick={() => setShowSetup(true)}
            disabled={isLoading}
            aria-labelledby="zero-knowledge-storage-label"
          >
            {isLoading ? <Spinner /> : localize('com_ui_zero_knowledge_enable')}
          </Button>
        ) : isUnlocked ? (
          <Button variant="outline" onClick={lockE2EE} aria-labelledby="zero-knowledge-storage-label">
            {localize('com_ui_zero_knowledge_lock')}
          </Button>
        ) : (
          <div className="flex w-full gap-2 sm:w-auto">
            <input
              aria-label={localize('com_ui_zero_knowledge_passphrase')}
              className="min-w-0 rounded-md border border-border-light bg-transparent px-3 py-2 text-sm"
              onChange={(event) => setPassphrase(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void handleUnlock()}
              placeholder={localize('com_ui_zero_knowledge_passphrase')}
              type="password"
              value={passphrase}
            />
            <Button disabled={isUnlocking || !passphrase} onClick={() => void handleUnlock()}>
              {isUnlocking ? <Spinner /> : localize('com_ui_zero_knowledge_unlock')}
            </Button>
            <Button variant="outline" onClick={() => setShowRecovery(true)}>
              {localize('com_ui_zero_knowledge_recover')}
            </Button>
          </div>
        )}
      </div>

      {showSetup && (
        <ZeroKnowledgeSetupWizard
          error={error}
          isLoading={isLoading}
          onClose={() => setShowSetup(false)}
          onCompleteSetup={setupE2EE}
          onSuccess={() => showToast({ message: localize('com_ui_zero_knowledge_enabled') })}
        />
      )}
      {showRecovery && (
        <RecoveryModal
          error={error}
          isLoading={isLoading}
          onClose={() => setShowRecovery(false)}
          onRecover={handleRecovery}
        />
      )}
    </>
  );
};

export default ZeroKnowledgeStorage;
