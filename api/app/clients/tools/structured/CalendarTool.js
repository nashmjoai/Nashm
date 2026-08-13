const { Tool } = require('@librechat/agents/langchain/tools');
const { logger } = require('@nashm/data-schemas');
const calendarJsonSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['list', 'create', 'update', 'delete', 'execute'],
      description: 'The action to perform on the calendar.',
    },
    startDate: {
      type: 'string',
      description: 'Start date for filtering events, or start date of the new/updated event (ISO format).',
    },
    endDate: {
      type: 'string',
      description: 'End date for filtering events, or end date of the new/updated event (ISO format).',
    },
    title: {
      type: 'string',
      description: 'Title of the event (required for create).',
    },
    description: {
      type: 'string',
      description: 'Description of the event.',
    },
    eventId: {
      type: 'string',
      description: 'ID of the event (required for update, delete, execute).',
    },
  },
  required: ['action'],
};

class CalendarTool extends Tool {
  static lc_name() {
    return 'calendar';
  }

  static get jsonSchema() {
    return calendarJsonSchema;
  }

  constructor(fields = {}) {
    super(fields);
    this.name = 'calendar';
    this.userId = fields.userId;
    this.description =
      "A professional calendar tool. Use this to view, create, update, or delete the user's calendar events and actions. When the user asks to add or create an event, YOU MUST use this tool with action='create'. DO NOT generate .ics files. Always add events directly to the system.";

    this.schema = calendarJsonSchema;
  }

  async _call(input) {
    if (!this.userId) {
      throw new Error('User ID is required to access the calendar.');
    }
    
    const { CalendarEvent } = require('~/db/models');

    try {
      const { action, startDate, endDate, title, description, eventId } = input;

      if (action === 'list') {
        const filter = { user: this.userId };
        if (startDate || endDate) {
          filter.startDate = {};
          if (startDate) filter.startDate.$gte = new Date(startDate);
          if (endDate) filter.startDate.$lte = new Date(endDate);
        } else {
          // Default to upcoming 30 days if no date provided
          const now = new Date();
          const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          filter.startDate = { $gte: now, $lte: next30 };
        }

        const events = await CalendarEvent.find(filter).sort({ startDate: 1 }).lean();
        return JSON.stringify({
          status: 'success',
          events: events.map(e => ({
            id: e._id,
            title: e.title,
            description: e.description,
            eventType: e.eventType,
            startDate: e.startDate,
            endDate: e.endDate,
            allDay: e.allDay,
            status: e.status
          }))
        });
      }

      if (action === 'create') {
        if (!title || !startDate) {
          throw new Error('Title and startDate are required to create an event.');
        }
        const event = await CalendarEvent.create({
          user: this.userId,
          title,
          description: description || '',
          eventType: 'event',
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          status: 'pending',
        });
        return JSON.stringify({ status: 'success', message: 'Event created successfully.', eventId: event._id });
      }
      
      if (action === 'delete') {
        if (!eventId) throw new Error('eventId is required to delete an event.');
        const deleted = await CalendarEvent.findOneAndDelete({ _id: eventId, user: this.userId });
        if (!deleted) throw new Error('Event not found or unauthorized.');
        return JSON.stringify({ status: 'success', message: 'Event deleted successfully.' });
      }

      return JSON.stringify({ error: `Unsupported action: ${action}` });
    } catch (error) {
      logger.error('[CalendarTool] Error:', error);
      return JSON.stringify({ error: error.message });
    }
  }
}

module.exports = CalendarTool;
