import type { Document, Types } from 'mongoose';

export const subscriptionPlans = ['free', 'individual', 'family', 'developer'] as const;
export const subscriptionStatuses = ['active', 'trialing', 'past_due', 'cancelled'] as const;
export const subscriptionSources = ['manual', 'family', 'stripe', 'paddle'] as const;

export type SubscriptionPlan = (typeof subscriptionPlans)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type SubscriptionSource = (typeof subscriptionSources)[number];

export interface IAllowedModel {
  endpoint: string;
  model: string;
}

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  allowedModels?: IAllowedModel[];
  notes?: string;
  startsAt?: Date;
  expiresAt?: Date;
  updatedBy?: Types.ObjectId;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
