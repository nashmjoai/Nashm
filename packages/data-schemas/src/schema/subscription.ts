import { Schema } from 'mongoose';
import type { ISubscription } from '~/types';
import { subscriptionPlans, subscriptionStatuses, subscriptionSources } from '~/types/subscription';

const AllowedModelSchema = new Schema(
  {
    endpoint: { type: String, required: true, trim: true, maxlength: 120 },
    model: { type: String, required: true, trim: true, maxlength: 256 },
  },
  { _id: false },
);

const subscriptionSchema: Schema<ISubscription> = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: subscriptionPlans,
      required: true,
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: subscriptionStatuses,
      required: true,
      default: 'active',
      index: true,
    },
    source: {
      type: String,
      enum: subscriptionSources,
      required: true,
      default: 'manual',
    },
    allowedModels: {
      type: [AllowedModelSchema],
      default: undefined,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    startsAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ user: 1, tenantId: 1 }, { unique: true });
subscriptionSchema.index({ plan: 1, status: 1, tenantId: 1 });

export default subscriptionSchema;
