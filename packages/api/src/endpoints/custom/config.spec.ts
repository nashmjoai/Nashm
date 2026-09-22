import { EModelEndpoint } from 'nashm-data-provider';
import type { TCustomEndpoints } from 'nashm-data-provider';
import { loadCustomEndpointsConfig } from './config';

const baseEndpoint = {
  apiKey: 'sk-test',
  baseURL: 'https://gateway.example.com',
  models: { default: ['claude-sonnet-4-5'] },
};

describe('loadCustomEndpointsConfig – native provider param set', () => {
  it('synthesizes defaultParamsEndpoint from provider so the UI shows the right params', () => {
    const config = loadCustomEndpointsConfig([
      { ...baseEndpoint, name: 'Claude-Compatible', provider: EModelEndpoint.anthropic },
    ] as unknown as TCustomEndpoints);

    expect(config?.['Claude-Compatible']?.customParams?.defaultParamsEndpoint).toBe(
      EModelEndpoint.anthropic,
    );
  });

  it('does not set defaultParamsEndpoint for endpoints without a provider', () => {
    const config = loadCustomEndpointsConfig([
      { ...baseEndpoint, name: 'My-LLM' },
    ] as unknown as TCustomEndpoints);

    expect(config?.['My-LLM']?.customParams).toBeUndefined();
  });

  it('respects an explicit non-default defaultParamsEndpoint over the provider', () => {
    const config = loadCustomEndpointsConfig([
      {
        ...baseEndpoint,
        name: 'Claude-Compatible',
        provider: EModelEndpoint.anthropic,
        customParams: { defaultParamsEndpoint: EModelEndpoint.google },
      },
    ] as unknown as TCustomEndpoints);

    expect(config?.['Claude-Compatible']?.customParams?.defaultParamsEndpoint).toBe(
      EModelEndpoint.google,
    );
  });

  it('omits endpoints whose apiKey is an unexpanded env var template', () => {
    delete process.env.TEST_KIMI_API_KEY;
    const config = loadCustomEndpointsConfig([
      {
        ...baseEndpoint,
        name: 'Kimi',
        apiKey: '${TEST_KIMI_API_KEY}',
      },
    ] as unknown as TCustomEndpoints);

    expect(config?.['Kimi']).toBeUndefined();
  });

  it('includes endpoints when the env var is defined in process.env', () => {
    process.env.TEST_KIMI_API_KEY = 'sk-actual-kimi-key';
    const config = loadCustomEndpointsConfig([
      {
        ...baseEndpoint,
        name: 'Kimi',
        apiKey: '${TEST_KIMI_API_KEY}',
      },
    ] as unknown as TCustomEndpoints);

    expect(config?.['Kimi']).toBeDefined();
    delete process.env.TEST_KIMI_API_KEY;
  });

  it('omits endpoints whose baseURL is an unexpanded env var template', () => {
    delete process.env.TEST_KIMI_BASE_URL;
    const config = loadCustomEndpointsConfig([
      {
        ...baseEndpoint,
        name: 'Kimi',
        baseURL: '${TEST_KIMI_BASE_URL}',
      },
    ] as unknown as TCustomEndpoints);

    expect(config?.['Kimi']).toBeUndefined();
  });

  it('includes endpoints when apiKey is user_provided', () => {
    const config = loadCustomEndpointsConfig([
      {
        ...baseEndpoint,
        name: 'UserProvidedKimi',
        apiKey: 'user_provided',
      },
    ] as unknown as TCustomEndpoints);

    expect(config?.['UserProvidedKimi']).toBeDefined();
    expect(config?.['UserProvidedKimi']?.userProvide).toBe(true);
  });
});

