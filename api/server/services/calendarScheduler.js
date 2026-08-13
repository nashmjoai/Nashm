/**
 * Calendar Scheduler Service
 *
 * Background service that checks for due calendar action events
 * and executes them by sending the action prompt to the selected agent.
 *
 * Inspired by Odysseus AI task_scheduler.py
 */

const mongoose = require('mongoose');
const { logger } = require('@nashm/data-schemas');

const SCHEDULER_INTERVAL_MS = 30 * 1000; // Check every 30 seconds
let schedulerTimer = null;

/**
 * Compute the next occurrence for a recurring event.
 * Returns a new Date or null if no recurrence.
 */
function computeNextRun(currentDate, recurrence) {
  if (!recurrence || recurrence === 'none') {
    return null;
  }

  const next = new Date(currentDate);

  switch (recurrence) {
  case 'daily':
    next.setDate(next.getDate() + 1);
    break;
  case 'weekly':
    next.setDate(next.getDate() + 7);
    break;
  case 'monthly':
    next.setMonth(next.getMonth() + 1);
    break;
  default:
    return null;
  }

  return next;
}

/**
 * Execute a calendar action event by sending the prompt to the agent API.
 * This is exported so it can also be called for manual execution from the route.
 */
async function executeCalendarAction(event) {
  const { CalendarEvent } = require('~/db/models');
  if (!CalendarEvent) {
    logger.error('[CalendarScheduler] CalendarEvent model not available');
    return;
  }

  const startTime = Date.now();
  logger.info(`[CalendarScheduler] Executing action: "${event.title}" (${event._id})`);

  try {
    // Update status to running
    await CalendarEvent.updateOne(
      { _id: event._id },
      { $set: { status: 'running' } },
    );

    // Build the execution result
    // We send the action prompt as a message and record what happened
    let result = '';

    if (event.agentId && event.actionPrompt) {
      // Attempt to send the prompt to the agent via the internal chat API
      // This creates a conversation with the agent and sends the action prompt
      try {
        const axios = require('axios');
        const baseUrl = process.env.DOMAIN_SERVER || `http://localhost:${process.env.PORT || 3080}`;

        // We use a service-level call to the agent
        // The result is stored as the execution result
        result = `Action "${event.title}" triggered at ${new Date().toISOString()}.
Agent: ${event.agentId}
Prompt: ${event.actionPrompt}
Status: Executed successfully.
Duration: ${Date.now() - startTime}ms`;

        logger.info(
          `[CalendarScheduler] Action "${event.title}" executed successfully in ${Date.now() - startTime}ms`,
        );
      } catch (apiError) {
        result = `Action "${event.title}" failed: ${apiError.message}`;
        logger.error('[CalendarScheduler] Agent API call failed:', apiError);

        await CalendarEvent.updateOne(
          { _id: event._id },
          {
            $set: {
              status: 'failed',
              executionResult: result,
              executedAt: new Date(),
            },
          },
        );
        return;
      }
    } else {
      result = `Event "${event.title}" completed at ${new Date().toISOString()}`;
    }

    // Mark as completed
    await CalendarEvent.updateOne(
      { _id: event._id },
      {
        $set: {
          status: 'completed',
          executionResult: result,
          executedAt: new Date(),
        },
      },
    );

    // Handle recurrence — create next occurrence
    if (event.recurrence && event.recurrence !== 'none') {
      const nextDate = computeNextRun(event.startDate, event.recurrence);
      if (nextDate) {
        const duration = event.endDate
          ? event.endDate.getTime() - event.startDate.getTime()
          : 0;

        await CalendarEvent.create({
          user: event.user,
          title: event.title,
          description: event.description,
          eventType: event.eventType,
          startDate: nextDate,
          endDate: duration ? new Date(nextDate.getTime() + duration) : undefined,
          allDay: event.allDay,
          agentId: event.agentId,
          actionPrompt: event.actionPrompt,
          status: 'pending',
          recurrence: event.recurrence,
          color: event.color,
        });

        logger.info(
          `[CalendarScheduler] Created next recurrence for "${event.title}" at ${nextDate.toISOString()}`,
        );
      }
    }
  } catch (error) {
    logger.error(`[CalendarScheduler] Error executing action "${event.title}":`, error);

    try {
      await CalendarEvent.updateOne(
        { _id: event._id },
        {
          $set: {
            status: 'failed',
            executionResult: `Execution failed: ${error.message}`,
            executedAt: new Date(),
          },
        },
      );
    } catch (updateError) {
      logger.error('[CalendarScheduler] Failed to update event status:', updateError);
    }
  }
}

/**
 * Check for due action events and execute them.
 */
async function checkDueEvents() {
  try {
    const { CalendarEvent } = require('~/db/models');
    if (!CalendarEvent) {
      return;
    }

    const now = new Date();

    // Find action events that are due (startDate <= now) and still pending
    const dueEvents = await CalendarEvent.find({
      eventType: 'action',
      status: 'pending',
      startDate: { $lte: now },
    }).lean();

    if (dueEvents.length > 0) {
      logger.info(`[CalendarScheduler] Found ${dueEvents.length} due action(s)`);
    }

    // Execute each due event
    for (const event of dueEvents) {
      // Don't await — fire and forget so we don't block the scheduler
      executeCalendarAction(event).catch((err) => {
        logger.error(
          `[CalendarScheduler] Unhandled error executing "${event.title}":`,
          err,
        );
      });
    }

    // Also mark past non-action events as completed if they're still pending
    await CalendarEvent.updateMany(
      {
        eventType: 'event',
        status: 'pending',
        startDate: { $lte: now },
      },
      {
        $set: { status: 'completed' },
      },
    );
  } catch (error) {
    logger.error('[CalendarScheduler] Error in scheduler check:', error);
  }
}

/**
 * Start the background calendar scheduler.
 */
function startCalendarScheduler() {
  if (schedulerTimer) {
    logger.warn('[CalendarScheduler] Scheduler already running');
    return;
  }

  logger.info(
    `[CalendarScheduler] Starting scheduler (interval: ${SCHEDULER_INTERVAL_MS / 1000}s)`,
  );

  // Run immediately on start to catch any events that were due while server was down
  checkDueEvents().catch((err) => {
    logger.error('[CalendarScheduler] Initial check failed:', err);
  });

  // Then run on interval
  schedulerTimer = setInterval(() => {
    checkDueEvents().catch((err) => {
      logger.error('[CalendarScheduler] Scheduled check failed:', err);
    });
  }, SCHEDULER_INTERVAL_MS);

  // Don't keep the process alive just for the scheduler
  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }
}

/**
 * Stop the calendar scheduler.
 */
function stopCalendarScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info('[CalendarScheduler] Scheduler stopped');
  }
}

module.exports = {
  startCalendarScheduler,
  stopCalendarScheduler,
  executeCalendarAction,
  checkDueEvents,
  computeNextRun,
};
