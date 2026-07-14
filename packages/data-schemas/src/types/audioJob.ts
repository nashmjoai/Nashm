import { Document, Types } from 'mongoose';

export interface IAudioJob extends Document {
  jobId: string;
  userId: Types.ObjectId;
  status: 'pending' | 'uploading' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
  audioFileId: string;
  transcriptData?: Array<{ speaker: string; start: number; end: number; text: string }>;
  summaryText?: string;
  audioDuration?: number;
  languageCode?: string;
  webhookSecret: string;
  assemblyTranscriptId?: string;
  assemblySpeechModelUsed?: string;
  error?: string;

  endpoint?: string;
  chatModel?: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
