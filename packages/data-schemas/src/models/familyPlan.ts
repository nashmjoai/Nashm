import { Model } from 'mongoose';
import type * as t from '~/types';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import familyPlanSchema from '~/schema/familyPlan';

export function createFamilyPlanModel(mongoose: typeof import('mongoose')): Model<t.IFamilyPlan> {
  applyTenantIsolation(familyPlanSchema);
  return (
    mongoose.models.FamilyPlan || mongoose.model<t.IFamilyPlan>('FamilyPlan', familyPlanSchema)
  );
}
