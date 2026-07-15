import mongoose, { Schema } from 'mongoose';
import type { IAudioJob } from '../types/audioJob';

const audioJobSchema: Schema<IAudioJob> = new Schema(
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
      enum: ['pending', 'uploading', 'transcribing', 'summarizing', 'completed', 'failed'],
      required: true,
      index: true,
    },
    audioFileId: {
      type: String,
      required: true,
    },
    transcriptData: {
      type: Schema.Types.Mixed,
    },
    summaryText: {
      type: String,
    },
    audioDuration: {
      type: Number,
    },
    languageCode: {
      type: String,
    },
    webhookSecret: {
      type: String,
      required: true,
    },
    assemblyTranscriptId: {
      type: String,
    },
    assemblySpeechModelUsed: {
      type: String,
    },
    error: {
      type: String,
    },

    endpoint: {
      type: String,
    },
    chatModel: {
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

export default audioJobSchema;
