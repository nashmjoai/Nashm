import type { Document, Types } from 'mongoose';
import type { SubscriptionPlan } from './subscription';

export const renewalPeriods = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type RenewalPeriod = (typeof renewalPeriods)[number];

export interface IModelTokenLimit {
  endpoint: string;
  model: string;
  tokensPerPeriod: number;
}

export interface IPlanConfig extends Document {
  _id: Types.ObjectId;
  plan: SubscriptionPlan;
  displayName?: string;
  priceText?: string;
  features?: string[];
  tokenQuota: number;
  renewalPeriod: RenewalPeriod;
  /** Family plan: minimum number of members (default 2) */
  familyMinMembers?: number;
  /** Family plan: tokens per member per period */
  familyMemberTokenQuota?: number;
  familyMemberRenewalPeriod?: RenewalPeriod;
  modelTokenLimits: IModelTokenLimit[];
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
