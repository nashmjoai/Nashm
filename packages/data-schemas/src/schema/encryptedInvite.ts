import { Schema } from 'mongoose';

export type EncryptedInviteRole = 'read' | 'write';

export interface IEncryptedConversationInvite {
  inviteId: string;
  conversationId: string;
  ownerUserId: string;
  recipientEmail?: string;
  role: EncryptedInviteRole;
  secretHash: string;
  encryptedConversationKey: {
    v: string;
    ct: string;
    iv: string;
  };
  tenantId?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const encryptedPayloadSchema: Schema<IEncryptedConversationInvite['encryptedConversationKey']> = new Schema(
  {
    v: { type: String, required: true },
    ct: { type: String, required: true },
    iv: { type: String, required: true },
  },
  { _id: false },
);

const encryptedInviteSchema: Schema<IEncryptedConversationInvite> = new Schema<IEncryptedConversationInvite>(
  {
    inviteId: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true, index: true },
    recipientEmail: { type: String, lowercase: true, trim: true },
    role: { type: String, enum: ['read', 'write'], required: true },
    secretHash: { type: String, required: true, select: false },
    encryptedConversationKey: { type: encryptedPayloadSchema, required: true },
    tenantId: { type: String, index: true },
    active: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);

encryptedInviteSchema.index({ conversationId: 1, ownerUserId: 1, active: 1 });

export default encryptedInviteSchema;
