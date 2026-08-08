import { businessAgentTemplates, getBusinessAgentDraft } from './agents';

describe('business agent templates', () => {
  it('provides a complete core company team with unique roles', () => {
    const templateIds = businessAgentTemplates.map((template) => template.id);
    const supportedCapabilities = new Set([
      'web_search',
      'file_search',
      'execute_code',
      'artifacts',
    ]);

    expect(templateIds).toHaveLength(20);
    expect(new Set(templateIds).size).toBe(templateIds.length);
    expect(businessAgentTemplates.filter((template) => template.featured)).toHaveLength(9);
    expect(businessAgentTemplates.map((template) => template.category)).toEqual(
      expect.arrayContaining(['general', 'hr', 'finance', 'it', 'sales', 'aftersales', 'rd']),
    );
    businessAgentTemplates.forEach((template) => {
      expect(template.capabilities.length).toBeGreaterThan(0);
      expect(
        template.capabilities.every((capability) => supportedCapabilities.has(capability)),
      ).toBe(true);
    });
  });

  it('creates an editable draft while retaining the selected template instructions', () => {
    const template = businessAgentTemplates[0];
    const localize = (key: string): string => `localized:${key}`;

    const draft = getBusinessAgentDraft(template, localize);

    expect(draft).toEqual({
      name: `localized:${template.nameKey}`,
      description: `localized:${template.descriptionKey}`,
      instructions: template.instructions,
      category: template.category,
    });
    expect(draft.instructions).toContain('Operating principles');
  });
});
