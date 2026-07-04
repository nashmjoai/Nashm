import { Schema } from 'mongoose';
import type { IPlanConfig, IModelTokenLimit } from '~/types';
import { renewalPeriods } from '~/types/planConfig';
import { subscriptionPlans } from '~/types/subscription';

const ModelTokenLimitSchema = new Schema<IModelTokenLimit>(
  {
    endpoint: { type: String, required: true, trim: true, maxlength: 120 },
    model: { type: String, required: true, trim: true, maxlength: 256 },
    tokensPerPeriod: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const planConfigSchema: Schema<IPlanConfig> = new Schema<IPlanConfig>(
  {
    plan: {
      type: String,
      enum: subscriptionPlans,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    priceText: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    tokenQuota: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    renewalPeriod: {
      type: String,
      enum: renewalPeriods,
      required: true,
      default: 'monthly',
    },
    familyMinMembers: {
      type: Number,
      min: 2,
      default: 2,
    },
    familyMemberTokenQuota: {
      type: Number,
      min: 0,
    },
    familyMemberRenewalPeriod: {
      type: String,
      enum: renewalPeriods,
    },
    modelTokenLimits: {
      type: [ModelTokenLimitSchema],
      default: [],
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

export default planConfigSchema;
