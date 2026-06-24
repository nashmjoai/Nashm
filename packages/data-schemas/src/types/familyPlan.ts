import type { Document, Types } from 'mongoose';

export type FamilyMemberRole = 'parent' | 'child';
export type FamilyPlanStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export interface IFamilyMember {
  user: Types.ObjectId;
  email: string;
  role: FamilyMemberRole;
  addedAt: Date;
}

export interface IFamilyPlan extends Document {
  _id: Types.ObjectId;
  /** The primary user who owns / pays for the family plan */
  owner: Types.ObjectId;
  /** All members including the owner (role: 'parent') and up to 4 children */
  members: IFamilyMember[];
  /** Billing / subscription status */
  status: FamilyPlanStatus;
  /** External subscription ID from Stripe / Paddle / etc. */
  externalSubscriptionId?: string;
  /** Date the current billing period ends */
  currentPeriodEnd?: Date;
  /** Tenant isolation key */
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
