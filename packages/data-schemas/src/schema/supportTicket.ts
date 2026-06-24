import { Schema } from 'mongoose';
import type { ISupportTicket } from '~/types';
import { supportEmailStatuses, supportTicketStatuses } from '~/types/supportTicket';

const supportTicketSchema: Schema<ISupportTicket> = new Schema<ISupportTicket>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
    status: {
      type: String,
      enum: supportTicketStatuses,
      default: 'open',
      index: true,
    },
    emailStatus: {
      type: String,
      enum: supportEmailStatuses,
      default: 'skipped',
      index: true,
    },
    emailError: {
      type: String,
      maxlength: 1000,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

supportTicketSchema.index({ createdAt: -1, tenantId: 1 });
supportTicketSchema.index({ user: 1, createdAt: -1, tenantId: 1 });

export default supportTicketSchema;
