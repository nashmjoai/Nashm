export type QuickArtifactActionType = 'slides' | 'document' | 'spreadsheet' | 'research';

export type QuickArtifactActionStatus = 'idle' | 'selected' | 'consumed';

export interface QuickArtifactActionState {
  status: QuickArtifactActionStatus;
  type?: QuickArtifactActionType;
}

export interface QuickArtifactAction {
  type: QuickArtifactActionType;
}

const artifactFormatInstructions = `
Create exactly one artifact in this response, unless the selected action is deep research.
Use this exact remark-directive wrapper for artifacts:

:::artifact{identifier="descriptive-kebab-case-id" type="application/vnd.nashm.slides" title="Professional Title"}
\`\`\`json
{
  "schemaVersion": "office-artifact.v1",
  "kind": "slides" | "document" | "workbook",
  "title": "Title",
  "locale": "ar-JO" | "en-US",
  "direction": "rtl" | "ltr" | "auto",
  "templateId": "...",
  "content": { ... }
}
\`\`\`
:::

Set the type attribute to:
- "application/vnd.nashm.slides" when creating Slides
- "application/vnd.nashm.document" when creating a Document
- "application/vnd.nashm.workbook" when creating a Spreadsheet/Workbook

The content inside the markdown code block MUST be a single, valid, complete JSON object matching the schema. DO NOT write any Javascript code, React components, HTML, imports, or text wrappers inside the code block itself.
Use "auto" direction when the user's language is unclear, "rtl" for Arabic, and "ltr" for English.
Do not explain that you are creating an artifact; produce the artifact directly.
`;

const slidesInstructions = `
Quick Artifact Action: Slides

The user selected Slides before submitting the prompt.
Create a professional slide deck preview as a JSON artifact with type="application/vnd.nashm.slides".
The JSON content shape must be:
{
  "schemaVersion": "office-artifact.v1",
  "kind": "slides",
  "title": string,
  "locale": string,
  "direction": "rtl" | "ltr" | "auto",
  "templateId": "nashm-executive-dark" | "nashm-modern-light" | "nashm-arabic-lux" | "nashm-data-studio" | "nashm-creative-color",
  "content": {
    "slides": Array<{
      "title": string,
      "layout": "cover" | "agenda" | "section" | "split" | "grid" | "kpi" | "chart" | "comparison" | "closing",
      "eyebrow"?: string,
      "content": string[],
      "notes"?: string
    }>
  }
}

Use a templateId that fits the user's topic and language. Make sure the content is highly detailed and complete.
`;

const documentInstructions = `
Quick Artifact Action: Document

The user selected Document before submitting the prompt.
Create a professional document preview as a JSON artifact with type="application/vnd.nashm.document".
The JSON content shape must be:
{
  "schemaVersion": "office-artifact.v1",
  "kind": "document",
  "title": string,
  "locale": string,
  "direction": "rtl" | "ltr" | "auto",
  "templateId": "nashm-report-pro" | "nashm-research-rtl" | "nashm-business-proposal" | "nashm-formal-letter" | "nashm-minimal-doc",
  "content": {
    "sections": Array<{
      "title": string,
      "paragraphs": string[],
      "list"?: {
        "type": "bullet" | "numbered",
        "items": string[]
      }
    }>
  }
}

Use a templateId that fits the user's topic and language.
`;

const spreadsheetInstructions = `
Quick Artifact Action: Excel

The user selected Excel before submitting the prompt.
Create a professional workbook preview as a JSON artifact with type="application/vnd.nashm.workbook".
The JSON content shape must be:
{
  "schemaVersion": "office-artifact.v1",
  "kind": "workbook",
  "title": string,
  "locale": string,
  "direction": "rtl" | "ltr" | "auto",
  "templateId": "nashm-finance-dashboard" | "nashm-project-tracker" | "nashm-crm-table" | "nashm-inventory" | "nashm-survey-analysis",
  "content": {
    "sheets": Array<{
      "name": string,
      "headers": string[],
      "rows": Array<Array<string | number>>,
      "summary"?: Array<{ "label": string, "value": string | number }>
    }>
  }
}

Use a templateId that fits the user's topic and language.
`;

const researchInstructions = `
Quick Artifact Action: Deep Research

The user selected Deep Research before submitting the prompt.
Act as a research agent. Plan the research, use available web/search capability when the environment provides it, compare sources, and produce a rigorous final Markdown report in the chat.
Do not create an artifact unless the user explicitly asks for export or a separate document.

The final answer must include:
- Executive summary
- Key findings
- Evidence and source comparison
- Caveats or uncertainty
- Practical recommendations or next steps

When sources are available, cite them clearly. If web/search is unavailable, say so briefly and continue with the best analysis from available context.
`;

const promptByType: Record<QuickArtifactActionType, string> = {
  slides: `${artifactFormatInstructions}\n${slidesInstructions}`,
  document: `${artifactFormatInstructions}\n${documentInstructions}`,
  spreadsheet: `${artifactFormatInstructions}\n${spreadsheetInstructions}`,
  research: researchInstructions,
};

export function getQuickArtifactActionPrompt(type: QuickArtifactActionType): string {
  return promptByType[type].trim();
}

export function isOfficeQuickArtifactAction(type: QuickArtifactActionType): boolean {
  return type === 'slides' || type === 'document' || type === 'spreadsheet';
}

export function isResearchQuickArtifactAction(type: QuickArtifactActionType): boolean {
  return type === 'research';
}
