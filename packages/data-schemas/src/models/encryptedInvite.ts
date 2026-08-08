import { Model } from 'mongoose';
import type { IEncryptedConversationInvite } from '~/schema/encryptedInvite';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import encryptedInviteSchema from '~/schema/encryptedInvite';

export function createEncryptedConversationInviteModel(
  mongoose: typeof import('mongoose'),
): Model<IEncryptedConversationInvite> {
  applyTenantIsolation(encryptedInviteSchema);
  return (
    mongoose.models.EncryptedConversationInvite ||
    mongoose.model<IEncryptedConversationInvite>('EncryptedConversationInvite', encryptedInviteSchema)
  );
}
