const express = require('express');
const mongoose = require('mongoose');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * GET /api/calendar/events
 * Get all events for the authenticated user within a date range.
 * Query params: startDate, endDate (ISO strings)
 */
router.get('/events', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    if (!CalendarEvent) {
      return res.status(500).json({ error: 'CalendarEvent model not initialized' });
    }

    const { startDate, endDate } = req.query;
    const filter = { user: req.user.id };

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    const events = await CalendarEvent.find(filter)
      .sort({ startDate: 1 })
      .lean();

    res.json({ events });
  } catch (error) {
    console.error('[Calendar] Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

/**
 * GET /api/calendar/events/:id
 * Get a single event by ID.
 */
router.get('/events/:id', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    const event = await CalendarEvent.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('[Calendar] Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * POST /api/calendar/events
 * Create a new calendar event or action.
 */
router.post('/events', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      allDay,
      agentId,
      actionPrompt,
      recurrence,
      color,
    } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'Title and startDate are required' });
    }

    if (eventType === 'action' && !agentId) {
      return res.status(400).json({ error: 'Agent is required for action events' });
    }

    if (eventType === 'action' && !actionPrompt) {
      return res.status(400).json({ error: 'Action prompt is required for action events' });
    }

    const event = await CalendarEvent.create({
      user: req.user.id,
      title,
      description: description || '',
      eventType: eventType || 'event',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      allDay: allDay || false,
      agentId: agentId || null,
      actionPrompt: actionPrompt || '',
      status: 'pending',
      recurrence: recurrence || 'none',
      color: color || '#C41E3A',
    });

    res.status(201).json({ event: event.toObject() });
  } catch (error) {
    console.error('[Calendar] Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PUT /api/calendar/events/:id
 * Update an existing event.
 */
router.put('/events/:id', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      allDay,
      agentId,
      actionPrompt,
      status,
      recurrence,
      color,
    } = req.body;

    const update = {};
    if (title !== undefined) {
      update.title = title;
    }
    if (description !== undefined) {
      update.description = description;
    }
    if (eventType !== undefined) {
      update.eventType = eventType;
    }
    if (startDate !== undefined) {
      update.startDate = new Date(startDate);
    }
    if (endDate !== undefined) {
      update.endDate = new Date(endDate);
    }
    if (allDay !== undefined) {
      update.allDay = allDay;
    }
    if (agentId !== undefined) {
      update.agentId = agentId;
    }
    if (actionPrompt !== undefined) {
      update.actionPrompt = actionPrompt;
    }
    if (status !== undefined) {
      update.status = status;
    }
    if (recurrence !== undefined) {
      update.recurrence = recurrence;
    }
    if (color !== undefined) {
      update.color = color;
    }

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('[Calendar] Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Delete an event.
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[Calendar] Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * POST /api/calendar/events/:id/execute
 * Manually trigger an action event's execution.
 */
router.post('/events/:id/execute', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    const event = await CalendarEvent.findOne({
      _id: req.params.id,
      user: req.user.id,
      eventType: 'action',
    });

    if (!event) {
      return res.status(404).json({ error: 'Action event not found' });
    }

    if (event.status === 'running') {
      return res.status(409).json({ error: 'Event is already running' });
    }

    // Mark as running
    event.status = 'running';
    await event.save();

    // Execute asynchronously — the scheduler service handles the actual execution
    // For manual triggers, we call the same execution logic
    const { executeCalendarAction } = require('~/server/services/calendarScheduler');
    executeCalendarAction(event).catch((err) => {
      console.error('[Calendar] Manual execution failed:', err);
    });

    res.json({ message: 'Execution started', event: event.toObject() });
  } catch (error) {
    console.error('[Calendar] Error executing event:', error);
    res.status(500).json({ error: 'Failed to execute event' });
  }
});

/**
 * GET /api/calendar/upcoming
 * Get upcoming events (next 24 hours) for notifications.
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { CalendarEvent } = require('~/db/models');
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const events = await CalendarEvent.find({
      user: req.user.id,
      startDate: { $gte: now, $lte: next24h },
      status: { $in: ['pending'] },
    })
      .sort({ startDate: 1 })
      .lean();

    res.json({ events });
  } catch (error) {
    console.error('[Calendar] Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

module.exports = router;
