import { EModelEndpoint } from 'nashm-data-provider';
import type { EndpointTokenConfig } from '~/types';
import { getModelMaxTokens, getModelMaxOutputTokens } from './tokens';

describe('getModelMaxTokens partial-override fallback', () => {
  const partialOverride: EndpointTokenConfig = {
    'custom-model': { prompt: 1, completion: 2, context: 32000, output: 4096 },
  };

  it('uses the override for a listed model', () => {
    expect(getModelMaxTokens('custom-model', EModelEndpoint.openAI, partialOverride)).toBe(32000);
  });

  it('falls back to the built-in map for a model absent from a partial override', () => {
    const fallback = getModelMaxTokens('gpt-4o', EModelEndpoint.openAI, partialOverride);
    const builtin = getModelMaxTokens('gpt-4o', EModelEndpoint.openAI);
    expect(fallback).toBe(builtin);
    expect(fallback).toBeGreaterThan(100000);
  });
});

describe('getModelMaxOutputTokens partial-override fallback', () => {
  const partialOverride: EndpointTokenConfig = {
    'custom-model': { prompt: 1, completion: 2, context: 32000, output: 4096 },
  };

  it('falls back to the built-in map for a model absent from a partial override', () => {
    const fallback = getModelMaxOutputTokens('gpt-4o', EModelEndpoint.openAI, partialOverride);
    const builtin = getModelMaxOutputTokens('gpt-4o', EModelEndpoint.openAI);
    expect(fallback).toBe(builtin);
    expect(fallback).toBeGreaterThan(0);
  });
});

describe('HUMAIN Node token limits', () => {
  it('uses the limits advertised by the HUMAIN models endpoint', () => {
    expect(getModelMaxTokens('humain-m3-preview', EModelEndpoint.openAI)).toBe(204800);
    expect(getModelMaxOutputTokens('humain-m3-preview', EModelEndpoint.openAI)).toBe(16384);
  });
});

describe('GPT-5.6 token limits', () => {
  it.each(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'])(
    'uses the documented context and output limits for %s',
    (model) => {
      expect(getModelMaxTokens(model, EModelEndpoint.openAI)).toBe(1050000);
      expect(getModelMaxOutputTokens(model, EModelEndpoint.openAI)).toBe(128000);
    },
  );
});
