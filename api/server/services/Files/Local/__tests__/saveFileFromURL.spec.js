jest.mock('axios');
jest.mock('@nashm/api', () => ({ deleteRagFile: jest.fn() }));
jest.mock('@nashm/data-schemas', () => ({
  logger: { warn: jest.fn(), error: jest.fn() },
}));
jest.mock('~/server/utils', () => ({
  getBufferMetadata: jest.fn(),
}));

const mockTmpBase = require('fs').mkdtempSync(
  require('path').join(require('os').tmpdir(), 'crud-save-url-'),
);

jest.mock('~/config/paths', () => {
  const path = require('path');
  return {
    publicPath: path.join(mockTmpBase, 'public'),
    uploads: path.join(mockTmpBase, 'uploads'),
  };
});

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getBufferMetadata } = require('~/server/utils');
const { saveFileFromURL } = require('../crud');

describe('saveFileFromURL', () => {
  beforeAll(() => {
    fs.mkdirSync(path.join(mockTmpBase, 'public', 'images'), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(mockTmpBase, { recursive: true, force: true });
  });

  test('returns filepath matching the detected extension and writes file correctly', async () => {
    const fakeBuffer = Buffer.from('fake-image-bytes');
    axios.mockResolvedValueOnce({
      data: fakeBuffer,
    });

    getBufferMetadata.mockResolvedValueOnce({
      bytes: fakeBuffer.length,
      type: 'image/webp',
      dimensions: { width: 1024, height: 1024 },
      extension: 'webp',
    });

    const result = await saveFileFromURL({
      userId: 'user-456',
      URL: 'https://example.com/original.png',
      fileName: 'img-test.png',
      basePath: 'images',
    });

    expect(result).not.toBeNull();
    expect(result.filepath).toBe('/images/user-456/img-test.webp');
    expect(result.type).toBe('image/webp');
    expect(result.bytes).toBe(fakeBuffer.length);
    expect(result.dimensions).toEqual({ width: 1024, height: 1024 });

    const expectedDiskPath = path.join(mockTmpBase, 'public', 'images', 'user-456', 'img-test.webp');
    expect(fs.existsSync(expectedDiskPath)).toBe(true);
    const diskContent = fs.readFileSync(expectedDiskPath);
    expect(diskContent).toEqual(fakeBuffer);
  });

  test('returns null if download fails', async () => {
    axios.mockRejectedValueOnce(new Error('Network error'));

    const result = await saveFileFromURL({
      userId: 'user-456',
      URL: 'https://invalid-url.example/test.png',
      fileName: 'test.png',
      basePath: 'images',
    });

    expect(result).toBeNull();
  });
});
