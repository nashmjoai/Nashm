import { Schema } from 'mongoose';
import type { ISystemErrorLog } from '~/types';
import { subscriptionPlans } from '~/types/subscription';
import { systemErrorSeverities } from '~/types/systemError';

const systemErrorDetailsSchema = new Schema(
  {
    endpoint: { type: String, trim: true, maxlength: 120 },
    model: { type: String, trim: true, maxlength: 256 },
    currentPlan: { type: String, enum: subscriptionPlans },
    requiredPlans: { type: [{ type: String, enum: subscriptionPlans }], default: undefined },
    tokensUsed: { type: Number, min: 0 },
    tokenLimit: { type: Number, min: 0 },
  },
  { _id: false },
);

const systemErrorLogSchema: Schema<ISystemErrorLog> = new Schema<ISystemErrorLog>(
  {
    reference: { type: String, required: true, unique: true, index: true, maxlength: 64 },
    code: { type: String, required: true, index: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 180 },
    message: { type: String, required: true, maxlength: 1000 },
    severity: { type: String, enum: systemErrorSeverities, required: true, index: true },
    statusCode: { type: Number, required: true, min: 100, max: 599 },
    route: { type: String, required: true, maxlength: 300 },
    method: { type: String, required: true, maxlength: 12 },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String, trim: true, maxlength: 320 },
    details: { type: systemErrorDetailsSchema, required: false },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

systemErrorLogSchema.index({ createdAt: -1, tenantId: 1 });

export default systemErrorLogSchema;
