const request = require('supertest');
const express = require('express');

const mockRefreshS3Url = jest.fn();
const mockNeedsRefresh = jest.fn();

jest.mock('@nashm/api', () => ({
  unescapeLaTeX: jest.fn((text) => text),
  countTokens: jest.fn(),
  sendFeedbackScore: jest.fn(),
  traceIdForMessage: jest.fn(),
  refreshS3Url: (...args) => mockRefreshS3Url(...args),
  needsRefresh: (...args) => mockNeedsRefresh(...args),
}));

jest.mock('@nashm/data-schemas', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const createMockMessages = () => [
  {
    messageId: 'msg-1',
    conversationId: 'convo-1',
    user: 'user-123',
    attachments: [
      {
        file_id: 'file-1',
        source: 's3',
        filepath: 'https://s3.example.com/expired-image.png?X-Amz-Signature=xyz',
      },
    ],
  },
];

const mockDb = {
  getMessages: jest.fn().mockImplementation(() => Promise.resolve(createMockMessages())),
  getMessagesByCursor: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ messages: createMockMessages(), nextCursor: null })),
  updateMessage: jest.fn().mockResolvedValue({}),
};

jest.mock('~/models', () => mockDb);

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  },
  validateMessageReq: (req, res, next) => next(),
}));

jest.mock('~/server/utils/encryptedInvite', () => ({
  authorizeEncryptedInvite: jest.fn().mockResolvedValue(null),
}));

const messagesRouter = require('../messages');

describe('messages S3 URL refresh', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/messages', messagesRouter);
  });

  test('refreshes expired S3 URLs on attachments when fetching by conversationId', async () => {
    mockNeedsRefresh.mockReturnValue(true);
    mockRefreshS3Url.mockResolvedValue('https://s3.example.com/fresh-image.png?X-Amz-Signature=abc');

    const res = await request(app).get('/api/messages/convo-1');

    expect(res.status).toBe(200);
    expect(mockNeedsRefresh).toHaveBeenCalledWith(
      'https://s3.example.com/expired-image.png?X-Amz-Signature=xyz',
      3600,
    );
    expect(mockRefreshS3Url).toHaveBeenCalled();
    expect(res.body[0].attachments[0].filepath).toBe(
      'https://s3.example.com/fresh-image.png?X-Amz-Signature=abc',
    );
    expect(mockDb.updateMessage).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        messageId: 'msg-1',
        attachments: [
          expect.objectContaining({
            filepath: 'https://s3.example.com/fresh-image.png?X-Amz-Signature=abc',
          }),
        ],
      }),
    );
  });

  test('does not refresh S3 URLs if not near expiration', async () => {
    mockNeedsRefresh.mockReturnValue(false);

    const res = await request(app).get('/api/messages/convo-1');

    expect(res.status).toBe(200);
    expect(mockRefreshS3Url).not.toHaveBeenCalled();
    expect(mockDb.updateMessage).not.toHaveBeenCalled();
    expect(res.body[0].attachments[0].filepath).toBe(
      'https://s3.example.com/expired-image.png?X-Amz-Signature=xyz',
    );
  });

  test('refreshes expired S3 URLs on attachments when fetching via cursor query', async () => {
    mockNeedsRefresh.mockReturnValue(true);
    mockRefreshS3Url.mockResolvedValue('https://s3.example.com/fresh-image.png?X-Amz-Signature=abc');

    const res = await request(app).get('/api/messages?conversationId=convo-1');

    expect(res.status).toBe(200);
    expect(mockNeedsRefresh).toHaveBeenCalled();
    expect(mockRefreshS3Url).toHaveBeenCalled();
    expect(res.body.messages[0].attachments[0].filepath).toBe(
      'https://s3.example.com/fresh-image.png?X-Amz-Signature=abc',
    );
  });
});
