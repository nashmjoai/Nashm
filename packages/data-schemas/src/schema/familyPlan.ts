import { Schema } from 'mongoose';
import type { IFamilyPlan } from '~/types';

const MAX_CHILDREN = 4;

const familyPlanSchema: Schema<IFamilyPlan> = new Schema<IFamilyPlan>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    members: {
      type: [
        {
          _id: false,
          user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          email: { type: String, required: true, lowercase: true },
          role: {
            type: String,
            enum: ['parent', 'child'],
            required: true,
          },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      validate: {
        validator(members: IFamilyPlan['members']) {
          const children = members.filter((m) => m.role === 'child');
          return children.length <= MAX_CHILDREN;
        },
        message: `Family plan cannot exceed ${MAX_CHILDREN} child members`,
      },
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'trialing'],
      default: 'active',
      index: true,
    },
    externalSubscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
    currentPeriodEnd: {
      type: Date,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

/* Compound indexes for fast member lookups */
familyPlanSchema.index({ 'members.user': 1 });
familyPlanSchema.index({ 'members.email': 1 });

export default familyPlanSchema;
