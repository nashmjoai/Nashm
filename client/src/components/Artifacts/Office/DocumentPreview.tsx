import { useMemo } from 'react';
import type { NashmDocument, DocumentSection } from 'nashm-data-provider';
import { cn } from '~/utils';

interface DocumentPreviewProps {
  data: NashmDocument;
  direction?: 'rtl' | 'ltr' | 'auto';
}

const TEMPLATES: Record<string, {
  pageBg: string;
  text: string;
  headerStyle: string;
  bodyStyle: string;
  headerLine?: string;
  borderStyle?: string;
}> = {
  'nashm-report-pro': {
    pageBg: 'bg-white',
    text: 'text-slate-900',
    headerStyle: 'font-sans font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6',
    bodyStyle: 'font-sans text-slate-700 leading-relaxed text-justify text-sm',
    headerLine: 'border-t-4 border-indigo-600',
  },
  'nashm-research-rtl': {
    pageBg: 'bg-[#faf8f5]',
    text: 'text-stone-900',
    headerStyle: 'font-serif font-extrabold text-stone-800 pb-1 mb-4 text-center',
    bodyStyle: 'font-serif text-stone-800 leading-double text-base text-justify',
    borderStyle: 'border border-stone-200',
  },
  'nashm-business-proposal': {
    pageBg: 'bg-white',
    text: 'text-slate-900',
    headerStyle: 'font-sans font-extrabold text-indigo-950 pb-2 mb-6 tracking-tight',
    bodyStyle: 'font-sans text-slate-800 leading-relaxed text-sm',
    headerLine: 'border-t-4 border-emerald-500',
  },
  'nashm-formal-letter': {
    pageBg: 'bg-white',
    text: 'text-gray-900',
    headerStyle: 'font-serif font-semibold text-gray-800 border-b pb-4 mb-8 text-lg',
    bodyStyle: 'font-serif text-gray-800 leading-relaxed text-sm',
  },
  'nashm-minimal-doc': {
    pageBg: 'bg-white shadow-sm border border-stone-100',
    text: 'text-stone-900',
    headerStyle: 'font-sans font-normal text-stone-700 uppercase tracking-widest text-xs border-b pb-2 mb-6',
    bodyStyle: 'font-sans text-stone-600 leading-loose text-xs',
  },
};

export default function DocumentPreview({ data, direction }: DocumentPreviewProps) {
  const templateId = data.templateId || 'nashm-report-pro';
  const template = TEMPLATES[templateId] || TEMPLATES['nashm-report-pro'];
  const sections = data.content?.sections || [];

  const isRTL = direction === 'rtl' || (direction === 'auto' && data.locale?.startsWith('ar'));

  const pages = useMemo(() => {
    // Basic heuristics: chunk sections into pages for document pagination.
    // If a section is large, it gets its own page. Otherwise, we pack them nicely.
    const chunks: DocumentSection[][] = [];
    let currentChunk: DocumentSection[] = [];
    let currentWeight = 0;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const weight = (sec.paragraphs?.length || 0) * 150 + (sec.list?.items?.length || 0) * 40 + 100;
      
      if (currentWeight + weight > 800 && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [sec];
        currentWeight = weight;
      } else {
        currentChunk.push(sec);
        currentWeight += weight;
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    return chunks;
  }, [sections]);

  if (sections.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-text-secondary">
        No document sections available.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-surface-primary-alt overflow-hidden">
      {/* Top bar info */}
      <div className="flex items-center justify-between border-b border-border-light bg-surface-primary px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">{data.title}</span>
          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-text-secondary">
            {templateId.replace('nashm-', '')}
          </span>
        </div>
        <div className="text-text-secondary">
          {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
        </div>
      </div>

      {/* Pages Container scroll area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8">
        {pages.map((pageSections, pageIdx) => (
          <div
            key={pageIdx}
            className={cn(
              'relative w-full max-w-[800px] aspect-[1/1.414] shadow-lg border border-slate-200/80 rounded-sm p-5 sm:p-12 md:p-16 flex flex-col justify-between transition-all duration-300 select-text',
              template.pageBg,
              template.text,
              template.borderStyle,
              isRTL && 'rtl'
            )}
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            {/* Top Border Accent Line */}
            {template.headerLine && (
              <div className={cn('absolute top-0 inset-x-0 h-1', template.headerLine)} />
            )}

            {/* Simulated Header */}
            <div className={cn('flex items-center justify-between text-[8px] sm:text-[10px] opacity-40 border-b pb-1 sm:pb-1.5 mb-3 sm:mb-6 uppercase tracking-wider', isRTL ? 'flex-row-reverse' : '')}>
              <span className="font-bold truncate max-w-[120px] sm:max-w-none">{data.title}</span>
              <span>Confidential</span>
            </div>

            {/* Document Content Flow */}
            <div className="flex-1 min-h-0 overflow-hidden space-y-3 sm:space-y-6">
              {pageSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-2 sm:space-y-4">
                  <h3 className={cn('text-sm sm:text-lg font-bold tracking-tight', template.headerStyle)}>
                    {sec.title}
                  </h3>
                  
                  <div className={cn('space-y-1.5 sm:space-y-3', template.bodyStyle)}>
                    {sec.paragraphs?.map((p, pIdx) => (
                      <p key={pIdx} className="leading-relaxed text-xs sm:text-sm">
                        {p}
                      </p>
                    ))}
                  </div>

                  {sec.list && sec.list.items?.length > 0 && (
                    <ul className={cn(
                      'mt-1 sm:mt-2 space-y-1 sm:space-y-1.5 pl-4 sm:pl-6 pr-4 sm:pr-6 text-xs sm:text-sm leading-relaxed opacity-90',
                      sec.list.type === 'numbered' ? 'list-decimal' : 'list-disc',
                      isRTL ? 'list-inside pl-0' : ''
                    )}>
                      {sec.list.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Simulated Footer */}
            <div className={cn('mt-4 sm:mt-8 border-t pt-1.5 sm:pt-3 flex items-center justify-between text-[8px] sm:text-[10px] opacity-40 font-semibold tracking-wider uppercase', isRTL ? 'flex-row-reverse' : '')}>
              <span>Nashm Docs v1.0</span>
              <span>
                {pageIdx + 1} / {pages.length}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
