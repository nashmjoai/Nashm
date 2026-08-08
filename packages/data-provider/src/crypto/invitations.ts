export type EncryptedInviteRole = 'read' | 'write';

export interface ActiveEncryptedInvite {
  conversationId: string;
  inviteId: string;
  secret: string;
  role: EncryptedInviteRole;
}

const storageKey = (conversationId: string) => `nashm.encrypted-invite.${conversationId}`;

export function getActiveEncryptedInvite(conversationId: string): ActiveEncryptedInvite | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const stored = sessionStorage.getItem(storageKey(conversationId));
    if (!stored) {
      return null;
    }
    const invite = JSON.parse(stored) as ActiveEncryptedInvite;
    return (
      invite.conversationId === conversationId &&
      typeof invite.inviteId === 'string' &&
      typeof invite.secret === 'string' &&
      (invite.role === 'read' || invite.role === 'write')
    )
      ? invite
      : null;
  } catch {
    return null;
  }
}

export function setActiveEncryptedInvite(invite: ActiveEncryptedInvite): void {
  sessionStorage.setItem(storageKey(invite.conversationId), JSON.stringify(invite));
}

export function clearActiveEncryptedInvite(conversationId: string): void {
  sessionStorage.removeItem(storageKey(conversationId));
}
