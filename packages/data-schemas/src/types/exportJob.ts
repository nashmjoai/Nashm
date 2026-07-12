import { Document, Types } from 'mongoose';

export interface IExportJob extends Document {
  jobId: string;
  userId: Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultFileId?: string;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
}
