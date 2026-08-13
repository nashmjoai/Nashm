import { Schema } from 'mongoose';
import type { ICalendarEvent } from '~/types/calendarEvent';

const CalendarEventSchema: Schema<ICalendarEvent> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    eventType: {
      type: String,
      enum: ['event', 'action'],
      default: 'event',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    agentId: {
      type: String,
      default: null,
    },
    actionPrompt: {
      type: String,
      maxlength: 5000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    color: {
      type: String,
      default: '#C41E3A',
    },
    executionResult: {
      type: String,
      maxlength: 10000,
      default: '',
    },
    executedAt: {
      type: Date,
      default: null,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries: user + date range
CalendarEventSchema.index({ user: 1, startDate: 1, endDate: 1 });
// Index for the scheduler to find due actions
CalendarEventSchema.index({ eventType: 1, status: 1, startDate: 1 });

export default CalendarEventSchema;
