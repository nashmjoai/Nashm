import { useMemo } from 'react';
import type { NashmDocument, DocumentSection, OfficeVisual } from 'nashm-data-provider';
import { cn } from '~/utils';

interface DocumentPreviewProps {
  data: NashmDocument;
  direction?: 'rtl' | 'ltr' | 'auto';
}

const TEMPLATES: Record<
  string,
  {
    pageBg: string;
    text: string;
    headerStyle: string;
    bodyStyle: string;
    headerLine?: string;
    borderStyle?: string;
  }
> = {
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
    headerStyle: 'font-sans font-extrabold text-stone-800 pb-1 mb-4',
    bodyStyle: 'font-sans text-stone-800 leading-double text-base text-justify',
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
    headerStyle:
      'font-sans font-normal text-stone-700 uppercase tracking-widest text-xs border-b pb-2 mb-6',
    bodyStyle: 'font-sans text-stone-600 leading-loose text-xs',
  },
};

function VisualFigure({ visual, isRTL }: { visual?: OfficeVisual; isRTL: boolean }) {
  if (!visual?.url) {
    return null;
  }

  return (
    <figure
      className={cn(
        'my-3 overflow-hidden rounded-md border border-black/10 bg-black/5 sm:my-5',
        isRTL && 'text-right',
      )}
    >
      <img
        src={visual.url}
        alt={visual.alt || visual.caption || ''}
        loading="lazy"
        className="h-28 w-full object-cover sm:h-40"
        onError={(event) => {
          event.currentTarget.closest('figure')?.classList.add('hidden');
        }}
      />
      {visual.caption && (
        <figcaption className="px-3 py-2 text-[10px] leading-relaxed opacity-70 sm:text-xs">
          {visual.caption}
        </figcaption>
      )}
    </figure>
  );
}

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
      const weight =
        (sec.paragraphs?.length || 0) * 150 + (sec.list?.items?.length || 0) * 40 + 100;

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
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary-alt">
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
      <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto p-8">
        {pages.map((pageSections, pageIdx) => (
          <div
            key={pageIdx}
            className={cn(
              'relative flex aspect-[1/1.414] w-full max-w-[800px] select-text flex-col justify-between rounded-sm border border-slate-200/80 p-5 shadow-lg transition-all duration-300 sm:p-12 md:p-16',
              template.pageBg,
              template.text,
              template.borderStyle,
              isRTL && 'rtl',
            )}
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            {/* Top Border Accent Line */}
            {template.headerLine && (
              <div className={cn('absolute inset-x-0 top-0 h-1', template.headerLine)} />
            )}

            {/* Simulated Header */}
            <div
              className={cn(
                'mb-3 flex items-center justify-between border-b pb-1 text-[8px] uppercase tracking-wider opacity-40 sm:mb-6 sm:pb-1.5 sm:text-[10px]',
                isRTL ? 'flex-row-reverse' : '',
              )}
            >
              <span className="max-w-[120px] truncate font-bold sm:max-w-none">{data.title}</span>
              <span>Confidential</span>
            </div>

            {/* Document Content Flow */}
            <div
              className="min-h-0 flex-1 space-y-3 overflow-hidden sm:space-y-6"
              style={{ textAlign: isRTL ? 'right' : 'left', unicodeBidi: 'plaintext' }}
            >
              {pageSections.map((sec, secIdx) => (
                <div key={secIdx} className="space-y-2 sm:space-y-4">
                  <h3
                    className={cn(
                      'text-sm font-bold tracking-tight sm:text-lg',
                      template.headerStyle,
                    )}
                  >
                    {sec.title}
                  </h3>

                  <VisualFigure
                    visual={sec.visual || (pageIdx === 0 && secIdx === 0 ? data.visual : undefined)}
                    isRTL={isRTL}
                  />

                  <div className={cn('space-y-1.5 sm:space-y-3', template.bodyStyle)}>
                    {sec.paragraphs?.map((p, pIdx) => (
                      <p
                        key={pIdx}
                        className={cn('text-xs leading-relaxed sm:text-sm', isRTL && 'text-right')}
                      >
                        {p}
                      </p>
                    ))}
                  </div>

                  {sec.list && sec.list.items?.length > 0 && (
                    <ul
                      className={cn(
                        'mt-1 space-y-1 pl-4 pr-4 text-xs leading-relaxed opacity-90 sm:mt-2 sm:space-y-1.5 sm:pl-6 sm:pr-6 sm:text-sm',
                        sec.list.type === 'numbered' ? 'list-decimal' : 'list-disc',
                        isRTL ? 'list-inside pl-0 pr-1 text-right' : '',
                      )}
                      style={{
                        direction: isRTL ? 'rtl' : 'ltr',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {sec.list.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Simulated Footer */}
            <div
              className={cn(
                'mt-4 flex items-center justify-between border-t pt-1.5 text-[8px] font-semibold uppercase tracking-wider opacity-40 sm:mt-8 sm:pt-3 sm:text-[10px]',
                isRTL ? 'flex-row-reverse' : '',
              )}
            >
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
