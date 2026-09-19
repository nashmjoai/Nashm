const mockGetOpenAIModels = jest.fn();
const mockGetAnthropicModels = jest.fn();
const mockGetBedrockModels = jest.fn();
const mockGetGoogleModels = jest.fn();

jest.mock('@nashm/data-schemas', () => ({
  logger: { error: jest.fn() },
}));

jest.mock('nashm-data-provider', () => ({
  EModelEndpoint: {
    openAI: 'openAI',
    anthropic: 'anthropic',
    azureOpenAI: 'azureOpenAI',
    assistants: 'assistants',
    azureAssistants: 'azureAssistants',
    google: 'google',
    bedrock: 'bedrock',
  },
}));

jest.mock('@nashm/api', () => ({
  mergeHeaders: jest.fn(() => undefined),
  getOpenAIModels: (...args) => mockGetOpenAIModels(...args),
  getAnthropicModels: (...args) => mockGetAnthropicModels(...args),
  getBedrockModels: (...args) => mockGetBedrockModels(...args),
  getGoogleModels: (...args) => mockGetGoogleModels(...args),
}));

jest.mock('./app', () => ({ getAppConfig: jest.fn() }));

const loadDefaultModels = require('./loadDefaultModels');

describe('loadDefaultModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOpenAIModels.mockResolvedValue([]);
    mockGetAnthropicModels.mockResolvedValue([]);
    mockGetBedrockModels.mockReturnValue([]);
    mockGetGoogleModels.mockReturnValue([]);
  });

  it('uses the configured OpenAI catalog without fetching the provider catalog', async () => {
    const models = ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'];
    const result = await loadDefaultModels({
      user: { id: 'user-id' },
      config: { endpoints: { openAI: { models } } },
    });

    expect(result.openAI).toEqual(models);
    expect(mockGetOpenAIModels.mock.calls.map(([options]) => options)).toEqual([
      expect.objectContaining({ azure: true }),
      expect.objectContaining({ assistants: true }),
      expect.objectContaining({ azureAssistants: true }),
    ]);
  });
});
