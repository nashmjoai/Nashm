import type { Document, Types } from 'mongoose';

export const supportTicketStatuses = ['open', 'reviewed', 'resolved'] as const;
export const supportEmailStatuses = ['skipped', 'sent', 'failed'] as const;

export type SupportTicketStatus = (typeof supportTicketStatuses)[number];
export type SupportEmailStatus = (typeof supportEmailStatuses)[number];

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  email: string;
  name?: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  emailStatus: SupportEmailStatus;
  emailError?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
