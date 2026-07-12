import mongoose, { Schema } from 'mongoose';
import type { IExportJob } from '../types/exportJob';

const exportJobSchema: Schema<IExportJob> = new Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      required: true,
      index: true,
    },
    resultFileId: {
      type: String,
    },
    error: {
      type: String,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default exportJobSchema;
