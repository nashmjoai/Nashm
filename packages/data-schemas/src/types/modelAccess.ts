import type { Document, Types } from 'mongoose';
import type { SubscriptionPlan } from './subscription';

export const modelCapabilities = [
  'vision',
  'file_upload',
  'web_search',
  'code_execution',
  'artifacts',
  'image_generation',
  'tools',
] as const;

export type ModelCapability = (typeof modelCapabilities)[number];

export interface IModelAccess {
  _id: Types.ObjectId;
  endpoint: string;
  model: string;
  enabled: boolean;
  showInChat: boolean;
  isDefault: boolean;
  label?: string;
  sortOrder: number;
  capabilities: ModelCapability[];
  allowedPlans: SubscriptionPlan[];
  notes?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
