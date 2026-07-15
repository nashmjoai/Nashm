const { validateOfficeArtifact } = require('../packages/data-provider/dist/index.js');

const validSlidesPayload = {
  schemaVersion: 'office-artifact.v1',
  kind: 'slides',
  title: 'Valid Slides Title',
  locale: 'ar',
  direction: 'rtl',
  templateId: 'nashm-dark',
  content: {
    slides: [
      {
        title: 'Slide 1',
        layout: 'cover',
        content: ['Bullet Point 1', 'Bullet Point 2'],
      }
    ]
  }
};

const invalidMissingTitle = {
  ...validSlidesPayload,
  title: undefined
};

const invalidKind = {
  ...validSlidesPayload,
  kind: 'invalid-kind'
};

const invalidOversizedSlides = {
  ...validSlidesPayload,
  content: {
    slides: Array.from({ length: 31 }, (_, idx) => ({
      title: `Slide ${idx + 1}`,
      layout: 'section',
      content: ['Some text']
    }))
  }
};

const invalidOversizedSlideChars = {
  ...validSlidesPayload,
  content: {
    slides: [
      {
        title: 'Slide 1',
        layout: 'cover',
        content: [ 'a'.repeat(2001) ]
      }
    ]
  }
};

const invalidOversizedWorkbookRows = {
  schemaVersion: 'office-artifact.v1',
  kind: 'workbook',
  title: 'Workbook Title',
  locale: 'ar',
  direction: 'rtl',
  templateId: 'nashm-finance',
  content: {
    sheets: [
      {
        name: 'Sheet 1',
        headers: ['Col1', 'Col2'],
        rows: Array.from({ length: 1001 }, () => [1, 2])
      }
    ]
  }
};

const invalidOversizedWorkbookCols = {
  schemaVersion: 'office-artifact.v1',
  kind: 'workbook',
  title: 'Workbook Title',
  locale: 'ar',
  direction: 'rtl',
  templateId: 'nashm-finance',
  content: {
    sheets: [
      {
        name: 'Sheet 1',
        headers: Array.from({ length: 51 }, (_, i) => `Col${i}`),
        rows: [[1, 2]]
      }
    ]
  }
};

const invalidOversizedDocumentParagraph = {
  schemaVersion: 'office-artifact.v1',
  kind: 'document',
  title: 'Doc Title',
  locale: 'ar',
  direction: 'rtl',
  templateId: 'nashm-doc',
  content: {
    sections: [
      {
        title: 'Section 1',
        paragraphs: ['a'.repeat(5001)]
      }
    ]
  }
};

const invalidOversizedStringField = {
  ...validSlidesPayload,
  title: 'a'.repeat(301)
};

const testCases = [
  { name: 'Valid Slides', payload: validSlidesPayload, expected: true },
  { name: 'Invalid Missing Title', payload: invalidMissingTitle, expected: false },
  { name: 'Invalid Kind', payload: invalidKind, expected: false },
  { name: 'Oversized Slides (>30)', payload: invalidOversizedSlides, expected: false },
  { name: 'Oversized Slide content chars (>2000)', payload: invalidOversizedSlideChars, expected: false },
  { name: 'Oversized Workbook Rows (>1000)', payload: invalidOversizedWorkbookRows, expected: false },
  { name: 'Oversized Workbook Cols (>50)', payload: invalidOversizedWorkbookCols, expected: false },
  { name: 'Oversized Document Paragraph (>5000)', payload: invalidOversizedDocumentParagraph, expected: false },
  { name: 'Oversized Title String (>300)', payload: invalidOversizedStringField, expected: false },
];

let allPassed = true;

for (const tc of testCases) {
  const result = validateOfficeArtifact(tc.payload);
  if (result === tc.expected) {
    console.log(`PASS: ${tc.name} returned ${result} as expected.`);
  } else {
    console.error(`FAIL: ${tc.name} returned ${result}, but expected ${tc.expected}.`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\nAll validation test cases passed successfully!');
} else {
  process.exit(1);
}
