import type { Document, Types } from 'mongoose';
import type { SubscriptionPlan } from './subscription';

export const systemErrorSeverities = ['warning', 'error', 'critical'] as const;
export type SystemErrorSeverity = (typeof systemErrorSeverities)[number];

export interface ISystemErrorDetails {
  endpoint?: string;
  model?: string;
  currentPlan?: SubscriptionPlan;
  requiredPlans?: SubscriptionPlan[];
  tokensUsed?: number;
  tokenLimit?: number;
}

export interface ISystemErrorLog extends Document {
  _id: Types.ObjectId;
  reference: string;
  code: string;
  title: string;
  message: string;
  severity: SystemErrorSeverity;
  statusCode: number;
  route: string;
  method: string;
  user?: Types.ObjectId;
  userEmail?: string;
  details?: ISystemErrorDetails;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
