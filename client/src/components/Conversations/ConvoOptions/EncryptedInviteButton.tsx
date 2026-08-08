import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CopyCheck } from 'lucide-react';
import { Button, OGDialog, OGDialogTemplate, useToastContext } from '@nashm/client';
import { useCopyToClipboard, useLocalize } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { cn } from '~/utils';
import useE2EE from '~/hooks/useE2EE';

const encryptedInviteUrl = (inviteId: string, secret: string) => {
  const base = document.querySelector('base')?.getAttribute('href') || '/';
  const pathname = `${base.replace(/\/$/, '')}/invite/${encodeURIComponent(inviteId)}`;
  return `${new URL(pathname, window.location.origin).toString()}#${secret}`;
};

export default function EncryptedInviteButton({
  conversationId,
  open,
  onOpenChange,
  triggerRef,
  children,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  children?: React.ReactNode;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { isUnlocked, createEncryptedInvite } = useE2EE();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [role, setRole] = useState<'read' | 'write'>('read');
  const [inviteUrl, setInviteUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const copy = useCopyToClipboard({ text: inviteUrl });

  const createInvite = async () => {
    setIsCreating(true);
    try {
      const { inviteId, secret } = await createEncryptedInvite(conversationId, {
        role,
        recipientEmail: recipientEmail || undefined,
      });
      setInviteUrl(encryptedInviteUrl(inviteId, secret));
      setShowQr(true);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : localize('com_ui_share_error'),
        severity: NotificationSeverity.ERROR,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange} triggerRef={triggerRef}>
      {children}
      <OGDialogTemplate
        showCloseButton={true}
        showCancelButton={false}
        title={localize('com_ui_encrypted_invite_title')}
        className="max-h-[90vh] max-w-[550px] overflow-y-auto"
        buttons={
          <Button variant="submit" disabled={!isUnlocked || isCreating} onClick={createInvite}>
            {isCreating ? localize('com_ui_creating') : localize('com_ui_create_invite')}
          </Button>
        }
        main={
          <div className="space-y-4 py-2 text-text-primary">
            <p className="text-sm text-text-secondary">
              {localize('com_ui_encrypted_invite_description')}
            </p>
            {!isUnlocked && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-text-primary">
                {localize('com_ui_encrypted_invite_locked')}
              </p>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {localize('com_ui_encrypted_invite_email')}
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder={localize('com_ui_encrypted_invite_email_placeholder')}
                className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm font-normal"
              />
              <span className="text-xs font-normal text-text-secondary">
                {localize('com_ui_encrypted_invite_email_hint')}
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {localize('com_ui_encrypted_invite_permission')}
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as 'read' | 'write')}
                className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm font-normal"
              >
                <option value="read">{localize('com_ui_encrypted_invite_read')}</option>
                <option value="write">{localize('com_ui_encrypted_invite_write')}</option>
              </select>
            </label>
            {inviteUrl && (
              <>
                {showQr && (
                  <div className="flex justify-center rounded-lg bg-white p-4">
                    <QRCodeSVG value={inviteUrl} size={210} marginSize={2} />
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-md bg-surface-secondary p-2">
                  <div className="flex-1 break-all text-sm text-text-secondary">{inviteUrl}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={localize('com_ui_copy_link')}
                    onClick={() => copy(setIsCopying)}
                    className={cn('shrink-0', isCopying ? 'cursor-default' : '')}
                  >
                    {isCopying ? <CopyCheck className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        }
      />
    </OGDialog>
  );
}
