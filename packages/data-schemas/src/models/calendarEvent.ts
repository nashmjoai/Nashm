import { Model } from 'mongoose';
import type { ICalendarEvent } from '~/types/calendarEvent';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import calendarEventSchema from '~/schema/calendarEvent';

export function createCalendarEventModel(
  mongoose: typeof import('mongoose'),
): Model<ICalendarEvent> {
  applyTenantIsolation(calendarEventSchema);
  return (
    mongoose.models.CalendarEvent ||
    mongoose.model<ICalendarEvent>('CalendarEvent', calendarEventSchema)
  );
}
