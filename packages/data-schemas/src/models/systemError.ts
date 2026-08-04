import type { Model } from 'mongoose';
import type * as t from '~/types';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import systemErrorLogSchema from '~/schema/systemError';

export function createSystemErrorLogModel(
  mongoose: typeof import('mongoose'),
): Model<t.ISystemErrorLog> {
  applyTenantIsolation(systemErrorLogSchema);
  return (
    mongoose.models.SystemErrorLog ||
    mongoose.model<t.ISystemErrorLog>('SystemErrorLog', systemErrorLogSchema)
  );
}
