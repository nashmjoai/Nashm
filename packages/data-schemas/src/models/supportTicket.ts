import { Model } from 'mongoose';
import type * as t from '~/types';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import supportTicketSchema from '~/schema/supportTicket';

export function createSupportTicketModel(
  mongoose: typeof import('mongoose'),
): Model<t.ISupportTicket> {
  applyTenantIsolation(supportTicketSchema);
  return (
    mongoose.models.SupportTicket ||
    mongoose.model<t.ISupportTicket>('SupportTicket', supportTicketSchema)
  );
}
