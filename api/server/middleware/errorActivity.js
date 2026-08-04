const { randomUUID } = require('node:crypto');
const { logger } = require('@nashm/data-schemas');
const { SystemErrorLog } = require('~/db/models');

const ignoredPrefixes = ['/api/rum', '/metrics'];

function routeFor(req) {
  return `${req.baseUrl ?? ''}${req.path ?? ''}`.slice(0, 300);
}

function userFor(req) {
  const id = req.user?.id ?? req.user?._id?.toString();
  return {
    ...(id ? { user: id } : {}),
    ...(typeof req.user?.email === 'string' && req.user.email.length > 0
      ? { userEmail: req.user.email }
      : {}),
  };
}

function defaultEvent(statusCode) {
  const isServerError = statusCode >= 500;
  return {
    code: isServerError ? 'SERVER_REQUEST_FAILED' : 'REQUEST_REJECTED',
    title: isServerError ? 'Service request failed' : 'Request could not be completed',
    message: isServerError
      ? 'The service could not complete this request. Review the request context and server logs.'
      : 'The request was rejected before it could be completed.',
    severity: isServerError ? 'error' : 'warning',
    statusCode,
  };
}

function errorActivity(req, res, next) {
  let recordedEvent = null;
  req.recordUserError = (event) => {
    recordedEvent = event;
  };

  res.once('finish', () => {
    const route = routeFor(req);
    if (ignoredPrefixes.some((prefix) => route.startsWith(prefix))) {
      return;
    }
    const event = recordedEvent ?? (res.statusCode >= 400 ? defaultEvent(res.statusCode) : null);
    if (!event) {
      return;
    }

    const payload = {
      reference: randomUUID(),
      ...event,
      route,
      method: req.method,
      ...userFor(req),
    };
    void SystemErrorLog.create(payload).catch((error) => {
      logger.error('[errorActivity] Failed to record user-facing error:', error);
    });
  });

  next();
}

module.exports = errorActivity;
