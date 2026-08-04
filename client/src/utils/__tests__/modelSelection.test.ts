import type { ModelCatalogResponse } from 'nashm-data-provider';
import { getPreferredModelSelection, saveUserModelSelection } from '../modelSelection';

const createCatalog = (): ModelCatalogResponse => ({
  currentPlan: 'free',
  defaultModel: { endpoint: 'google', model: 'gemini-3.5-flash' },
  models: {
    google: [
      {
        model: 'gemini-3.5-flash',
        sortOrder: 0,
        isDefault: true,
        capabilities: [],
        available: true,
        requiredPlans: ['free'],
      },
    ],
    kimi: [
      {
        model: 'kimi-agent',
        sortOrder: 0,
        isDefault: false,
        capabilities: [],
        available: true,
        requiredPlans: ['free'],
      },
    ],
  },
});

describe('getPreferredModelSelection', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the model explicitly selected by the user', () => {
    saveUserModelSelection({ endpoint: 'kimi', model: 'kimi-agent' }, 'user-1');

    expect(getPreferredModelSelection(createCatalog(), [], 'user-1')).toEqual({
      endpoint: 'kimi',
      model: 'kimi-agent',
    });
  });

  it('uses the administrator default for a new user', () => {
    expect(getPreferredModelSelection(createCatalog())).toEqual({
      endpoint: 'google',
      model: 'gemini-3.5-flash',
    });
  });

  it('does not restore a model the user can no longer access', () => {
    saveUserModelSelection({ endpoint: 'kimi', model: 'kimi-agent' }, 'user-1');
    const catalog = createCatalog();
    catalog.models.kimi[0].available = false;

    expect(getPreferredModelSelection(catalog, [], 'user-1')).toEqual({
      endpoint: 'google',
      model: 'gemini-3.5-flash',
    });
  });

  it('uses the first visible model available to the current subscription', () => {
    const catalog = createCatalog();
    catalog.defaultModel = null;
    catalog.models.google[0].available = false;

    expect(getPreferredModelSelection(catalog, ['google', 'kimi'])).toEqual({
      endpoint: 'kimi',
      model: 'kimi-agent',
    });
  });

  it("does not reuse another user's saved model", () => {
    saveUserModelSelection({ endpoint: 'kimi', model: 'kimi-agent' }, 'user-1');

    expect(getPreferredModelSelection(createCatalog(), [], 'user-2')).toEqual({
      endpoint: 'google',
      model: 'gemini-3.5-flash',
    });
  });
});
