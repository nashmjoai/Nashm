import { Model } from 'mongoose';
import type * as t from '~/types';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import planConfigSchema from '~/schema/planConfig';

export function createPlanConfigModel(mongoose: typeof import('mongoose')): Model<t.IPlanConfig> {
  applyTenantIsolation(planConfigSchema);
  return (
    mongoose.models.PlanConfig || mongoose.model<t.IPlanConfig>('PlanConfig', planConfigSchema)
  );
}
