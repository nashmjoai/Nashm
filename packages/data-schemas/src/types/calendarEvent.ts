import type { Types, Document } from 'mongoose';

export interface ICalendarEvent extends Document {
  user: Types.ObjectId;
  title: string;
  description?: string;
  eventType: 'event' | 'action';
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  agentId?: string;
  actionPrompt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  color?: string;
  executionResult?: string;
  executedAt?: Date;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICalendarEventLean {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  description?: string;
  eventType: 'event' | 'action';
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  agentId?: string;
  actionPrompt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  color?: string;
  executionResult?: string;
  executedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
