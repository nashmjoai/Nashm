import { Schema } from 'mongoose';
import type { IModelAccess } from '~/types';
import { modelCapabilities } from '~/types/modelAccess';
import { subscriptionPlans } from '~/types/subscription';

const modelAccessSchema: Schema<IModelAccess> = new Schema<IModelAccess>(
  {
    endpoint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
      index: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    showInChat: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1000000,
    },
    capabilities: {
      type: [{ type: String, enum: modelCapabilities }],
      default: [],
    },
    allowedPlans: {
      type: [{ type: String, enum: subscriptionPlans }],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

modelAccessSchema.index({ endpoint: 1, model: 1, tenantId: 1 }, { unique: true });

export default modelAccessSchema;
