export const MAX_SLIDES = 30;
export const MAX_SLIDE_CHARS = 2000;
export const MAX_ROWS = 1000;
export const MAX_COLUMNS = 50;
export const MAX_SHEETS = 20;
export const MAX_SECTIONS = 50;
export const MAX_PARAGRAPH_CHARS = 5000;
export const MAX_LIST_ITEMS = 200;
export const MAX_STRING_LENGTH = 300;

export interface BaseOfficeArtifact {
  schemaVersion: 'office-artifact.v1';
  kind: 'slides' | 'document' | 'workbook';
  title: string;
  locale: string;
  direction: 'rtl' | 'ltr' | 'auto';
  templateId: string;
}

export interface SlideItem {
  title: string;
  layout: 'cover' | 'agenda' | 'section' | 'split' | 'grid' | 'kpi' | 'chart' | 'comparison' | 'closing';
  eyebrow?: string;
  content: string[];
  notes?: string;
}

export interface NashmSlides extends BaseOfficeArtifact {
  kind: 'slides';
  content: {
    slides: SlideItem[];
  };
}

export interface DocumentSection {
  title: string;
  paragraphs: string[];
  list?: {
    type: 'bullet' | 'numbered';
    items: string[];
  };
}

export interface NashmDocument extends BaseOfficeArtifact {
  kind: 'document';
  content: {
    sections: DocumentSection[];
  };
}

export interface WorkbookSheet {
  name: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  summary?: Array<{ label: string; value: string | number }>;
}

export interface NashmWorkbook extends BaseOfficeArtifact {
  kind: 'workbook';
  content: {
    sheets: WorkbookSheet[];
  };
}

export type NashmOfficeArtifact = NashmSlides | NashmDocument | NashmWorkbook;

function isStr(val: unknown, maxLen = MAX_STRING_LENGTH): boolean {
  return typeof val === 'string' && val.length <= maxLen;
}

export function validateOfficeArtifact(data: unknown): data is NashmOfficeArtifact {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Partial<BaseOfficeArtifact>;
  
  if (obj.schemaVersion !== 'office-artifact.v1') {
    return false;
  }
  if (!['slides', 'document', 'workbook'].includes(obj.kind ?? '')) {
    return false;
  }
  if (!isStr(obj.title) || !isStr(obj.locale) || !isStr(obj.templateId)) {
    return false;
  }
  if (!['rtl', 'ltr', 'auto'].includes(obj.direction ?? '')) {
    return false;
  }

  // Kind-specific validation
  if (obj.kind === 'slides') {
    const slidesData = data as Partial<NashmSlides>;
    if (typeof slidesData.content !== 'object' || slidesData.content === null) {
      return false;
    }
    const slides = slidesData.content.slides;
    if (!Array.isArray(slides) || slides.length > MAX_SLIDES) {
      return false;
    }

    for (const slide of slides) {
      if (typeof slide !== 'object' || slide === null) {
        return false;
      }
      if (!isStr(slide.title) || !isStr(slide.layout)) {
        return false;
      }
      if (slide.eyebrow !== undefined && !isStr(slide.eyebrow)) {
        return false;
      }
      if (slide.notes !== undefined && typeof slide.notes !== 'string') {
        return false;
      }
      if (!Array.isArray(slide.content)) {
        return false;
      }

      let combinedLen = slide.title.length + slide.layout.length;
      if (slide.eyebrow) combinedLen += slide.eyebrow.length;
      if (slide.notes) combinedLen += slide.notes.length;

      for (const item of slide.content) {
        if (!isStr(item)) {
          return false;
        }
        combinedLen += item.length;
      }

      if (combinedLen > MAX_SLIDE_CHARS) {
        return false;
      }
    }
  } else if (obj.kind === 'document') {
    const docData = data as Partial<NashmDocument>;
    if (typeof docData.content !== 'object' || docData.content === null) {
      return false;
    }
    const sections = docData.content.sections;
    if (!Array.isArray(sections) || sections.length > MAX_SECTIONS) {
      return false;
    }

    for (const section of sections) {
      if (typeof section !== 'object' || section === null) {
        return false;
      }
      if (!isStr(section.title)) {
        return false;
      }
      if (!Array.isArray(section.paragraphs)) {
        return false;
      }
      for (const p of section.paragraphs) {
        if (!isStr(p, MAX_PARAGRAPH_CHARS)) {
          return false;
        }
      }

      if (section.list !== undefined) {
        const list = section.list;
        if (typeof list !== 'object' || list === null) {
          return false;
        }
        if (!['bullet', 'numbered'].includes(list.type ?? '')) {
          return false;
        }
        if (!Array.isArray(list.items) || list.items.length > MAX_LIST_ITEMS) {
          return false;
        }
        for (const item of list.items) {
          if (!isStr(item)) {
            return false;
          }
        }
      }
    }
  } else if (obj.kind === 'workbook') {
    const wbData = data as Partial<NashmWorkbook>;
    if (typeof wbData.content !== 'object' || wbData.content === null) {
      return false;
    }
    const sheets = wbData.content.sheets;
    if (!Array.isArray(sheets) || sheets.length > MAX_SHEETS) {
      return false;
    }

    for (const sheet of sheets) {
      if (typeof sheet !== 'object' || sheet === null) {
        return false;
      }
      if (!isStr(sheet.name)) {
        return false;
      }
      if (!Array.isArray(sheet.headers) || sheet.headers.length > MAX_COLUMNS) {
        return false;
      }
      for (const header of sheet.headers) {
        if (!isStr(header)) {
          return false;
        }
      }

      if (!Array.isArray(sheet.rows) || sheet.rows.length > MAX_ROWS) {
        return false;
      }
      for (const row of sheet.rows) {
        if (!Array.isArray(row) || row.length > MAX_COLUMNS) {
          return false;
        }
        for (const cell of row) {
          if (typeof cell === 'string') {
            if (cell.length > MAX_STRING_LENGTH) {
              return false;
            }
          } else if (typeof cell !== 'number') {
            return false;
          }
        }
      }

      if (sheet.summary !== undefined) {
        if (!Array.isArray(sheet.summary)) {
          return false;
        }
        for (const item of sheet.summary) {
          if (typeof item !== 'object' || item === null) {
            return false;
          }
          if (!isStr(item.label)) {
            return false;
          }
          if (typeof item.value === 'string') {
            if (item.value.length > MAX_STRING_LENGTH) {
              return false;
            }
          } else if (typeof item.value !== 'number') {
            return false;
          }
        }
      }
    }
  }

  return true;
}
