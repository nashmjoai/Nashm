import type { Document, Types } from 'mongoose';
import type { SubscriptionPlan } from './subscription';

export interface IModelAccess extends Document {
  _id: Types.ObjectId;
  endpoint: string;
  model: string;
  enabled: boolean;
  label?: string;
  allowedPlans: SubscriptionPlan[];
  notes?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
