import { Model } from 'mongoose';
import type * as t from '~/types';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import modelAccessSchema from '~/schema/modelAccess';

export function createModelAccessModel(mongoose: typeof import('mongoose')): Model<t.IModelAccess> {
  applyTenantIsolation(modelAccessSchema);
  return (
    mongoose.models.ModelAccess || mongoose.model<t.IModelAccess>('ModelAccess', modelAccessSchema)
  );
}
