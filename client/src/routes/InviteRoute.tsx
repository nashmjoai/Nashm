import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner } from '@nashm/client';
import { useLocalize } from '~/hooks';
import useE2EE from '~/hooks/useE2EE';
import useAuthRedirect from './useAuthRedirect';

export default function InviteRoute() {
  const { inviteId = '' } = useParams();
  const navigate = useNavigate();
  const localize = useLocalize();
  const { isAuthenticated } = useAuthRedirect();
  const { isEnabled, isUnlocked, activateEncryptedInvite } = useE2EE();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isEnabled || !isUnlocked || !inviteId) {
      return;
    }
    const secret = window.location.hash.slice(1);
    if (!secret) {
      setError(localize('com_ui_encrypted_invite_invalid'));
      return;
    }

    let active = true;
    void activateEncryptedInvite(inviteId, secret)
      .then(({ conversationId }) => {
        if (active) {
          navigate(`/c/${encodeURIComponent(conversationId)}?invite=${encodeURIComponent(inviteId)}`, {
            replace: true,
          });
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : localize('com_ui_encrypted_invite_invalid'));
        }
      });
    return () => {
      active = false;
    };
  }, [activateEncryptedInvite, inviteId, isAuthenticated, isEnabled, isUnlocked, localize, navigate]);

  let content: ReactNode = <Spinner className="text-text-primary" />;
  if (error) {
    content = <p className="max-w-md text-center text-sm text-danger">{error}</p>;
  } else if (isAuthenticated && !isEnabled) {
    content = <p className="max-w-md text-center text-sm">{localize('com_ui_encrypted_invite_setup')}</p>;
  } else if (isAuthenticated && !isUnlocked) {
    content = <p className="max-w-md text-center text-sm">{localize('com_ui_encrypted_invite_unlock')}</p>;
  }

  return <main className="flex min-h-screen items-center justify-center p-6">{content}</main>;
}
