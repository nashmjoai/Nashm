import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Play, LayoutGrid } from 'lucide-react';
import type { NashmSlides, SlideItem, OfficeVisual } from 'nashm-data-provider';
import { cn } from '~/utils';

interface SlidesPreviewProps {
  data: NashmSlides;
  direction?: 'rtl' | 'ltr' | 'auto';
}

const THEMES: Record<
  string,
  {
    bg: string;
    cardBg: string;
    text: string;
    accent: string;
    eyebrow: string;
    border: string;
    glow?: string;
  }
> = {
  'nashm-executive-dark': {
    bg: 'bg-slate-950',
    cardBg: 'bg-slate-900/80 border-slate-800',
    text: 'text-slate-100',
    accent: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    eyebrow: 'text-amber-500 font-semibold tracking-wider uppercase',
    border: 'border-slate-800',
    glow: 'shadow-[0_0_50px_rgba(245,158,11,0.05)]',
  },
  'nashm-modern-light': {
    bg: 'bg-slate-50',
    cardBg: 'bg-white border-slate-200/80 shadow-sm',
    text: 'text-slate-900',
    accent: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    eyebrow: 'text-indigo-600 font-medium tracking-wide uppercase',
    border: 'border-slate-200',
  },
  'nashm-arabic-lux': {
    bg: 'bg-emerald-950',
    cardBg: 'bg-emerald-900/60 border-amber-600/30 backdrop-blur',
    text: 'text-amber-100',
    accent: 'text-amber-400 bg-amber-950/40 border-amber-600/40',
    eyebrow: 'text-amber-400 font-serif tracking-widest',
    border: 'border-amber-900/50',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.08)]',
  },
  'nashm-data-studio': {
    bg: 'bg-stone-100',
    cardBg: 'bg-white border-stone-300 shadow-sm',
    text: 'text-stone-900',
    accent: 'text-sky-600 bg-sky-50 border-sky-100',
    eyebrow: 'text-stone-500 font-mono tracking-tight uppercase',
    border: 'border-stone-200',
  },
  'nashm-creative-color': {
    bg: 'bg-gradient-to-tr from-violet-950 via-indigo-950 to-slate-950',
    cardBg: 'bg-white/5 border-white/10 backdrop-blur-md',
    text: 'text-white',
    accent: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    eyebrow: 'text-rose-400 font-semibold tracking-wider uppercase',
    border: 'border-white/10',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.1)]',
  },
};

function VisualPanel({
  visual,
  isRTL,
  compact = false,
}: {
  visual?: OfficeVisual;
  isRTL: boolean;
  compact?: boolean;
}) {
  if (!visual?.url) {
    return null;
  }

  return (
    <figure
      className={cn(
        'overflow-hidden rounded-lg border border-white/10 bg-black/10',
        compact ? 'h-24 sm:h-32' : 'h-full min-h-32',
        isRTL && 'text-right',
      )}
    >
      <img
        src={visual.url}
        alt={visual.alt || visual.caption || ''}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.closest('figure')?.classList.add('hidden');
        }}
      />
      {visual.caption && (
        <figcaption className="px-2 py-1 text-[8px] leading-snug opacity-70 sm:text-[10px]">
          {visual.caption}
        </figcaption>
      )}
    </figure>
  );
}

export default function SlidesPreview({ data, direction }: SlidesPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const themeId = data.templateId || 'nashm-executive-dark';
  const theme = THEMES[themeId] || THEMES['nashm-executive-dark'];
  const slides = data.content?.slides || [];
  const currentSlide = slides[activeIndex] as SlideItem | undefined;

  const isRTL = direction === 'rtl' || (direction === 'auto' && data.locale?.startsWith('ar'));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) =>
          isRTL ? Math.max(0, prev - 1) : Math.min(slides.length - 1, prev + 1),
        );
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) =>
          isRTL ? Math.min(slides.length - 1, prev + 1) : Math.max(0, prev - 1),
        );
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isFullscreen, isRTL]);

  if (slides.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-text-secondary">
        No slides available.
      </div>
    );
  }

  const nextSlide = () => {
    setActiveIndex((prev) => Math.min(slides.length - 1, prev + 1));
  };

  const prevSlide = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const renderSlideContent = (slide: SlideItem) => {
    const layout = slide.layout || 'split';
    const content = slide.content || [];
    const visual = slide.visual || (activeIndex === 0 ? data.visual : undefined);

    switch (layout) {
      case 'cover':
        return (
          <div className="relative flex h-full flex-col justify-center overflow-hidden px-6 py-4 text-center sm:px-12 sm:py-8">
            {visual?.url && (
              <>
                <img
                  src={visual.url}
                  alt={visual.alt || visual.caption || ''}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                  onError={(event) => {
                    event.currentTarget.classList.add('hidden');
                  }}
                />
                <div className="absolute inset-0 bg-black/35" />
              </>
            )}
            {slide.eyebrow && (
              <span
                className={cn(
                  'relative z-10 mb-2 text-xs font-semibold uppercase tracking-widest sm:mb-4 sm:text-sm',
                  theme.eyebrow,
                )}
              >
                {slide.eyebrow}
              </span>
            )}
            <h1 className="relative z-10 text-xl font-extrabold leading-tight tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              {slide.title}
            </h1>
            <div className="relative z-10 mx-auto mt-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 sm:mt-6 sm:h-1 sm:w-24" />
            {content.length > 0 && (
              <p className="relative z-10 mx-auto mt-3 max-w-2xl text-xs opacity-90 sm:mt-6 sm:text-base md:text-lg">
                {content[0]}
              </p>
            )}
          </div>
        );

      case 'section':
        return (
          <div className="flex h-full flex-col justify-center px-6 py-4 sm:px-12 sm:py-8">
            {slide.eyebrow && (
              <span
                className={cn(
                  'mb-1.5 text-xs font-semibold uppercase tracking-wider sm:mb-3 sm:text-sm',
                  theme.eyebrow,
                )}
              >
                {slide.eyebrow}
              </span>
            )}
            <h2 className="text-lg font-bold leading-snug sm:text-2xl md:text-3xl lg:text-4xl">
              {slide.title}
            </h2>
            <div className="mt-2 h-1 w-12 rounded bg-gradient-to-r from-amber-500 to-amber-600 sm:mt-4 sm:w-16" />
            {content.length > 0 && (
              <div className="mt-3 space-y-1.5 opacity-90 sm:mt-6 sm:space-y-3">
                {content.map((text, i) => (
                  <p key={i} className="text-xs leading-relaxed sm:text-sm md:text-base">
                    {text}
                  </p>
                ))}
              </div>
            )}
            <VisualPanel visual={visual} isRTL={isRTL} compact />
          </div>
        );

      case 'kpi':
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <h3 className="border-b pb-1.5 text-xs font-bold opacity-90 sm:pb-3 sm:text-base md:text-lg lg:text-xl">
              {slide.title}
            </h3>
            <div className="my-auto grid grid-cols-2 gap-2 sm:gap-4 md:gap-6">
              {content.map((item, i) => {
                const parts = item.split(':');
                const val = parts[0]?.trim();
                const label = parts[1]?.trim() || '';
                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg border p-2 text-center transition-all duration-300 sm:rounded-xl sm:p-4 md:p-6',
                      theme.cardBg,
                    )}
                  >
                    <div className="text-lg font-black tracking-tight text-amber-500 sm:text-2xl md:text-3xl lg:text-4xl">
                      {val}
                    </div>
                    <div className="mt-0.5 text-[9px] font-medium uppercase opacity-75 sm:mt-2 sm:text-xs">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <h3 className="border-b pb-1.5 text-xs font-bold opacity-90 sm:pb-3 sm:text-base md:text-lg lg:text-xl">
              {slide.title}
            </h3>
            <div className="my-auto grid grid-cols-2 gap-2 sm:gap-4 md:gap-6">
              {content.map((col, i) => {
                const lines = col.split('\n').filter(Boolean);
                const colTitle = lines[0] || '';
                const items = lines.slice(1);
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex h-full flex-col rounded-lg border p-2 sm:rounded-xl sm:p-4 md:p-5',
                      theme.cardBg,
                    )}
                  >
                    <div className="mb-1.5 border-b pb-1 text-[10px] font-bold uppercase tracking-wide text-amber-500 sm:mb-3 sm:pb-2 sm:text-xs md:text-sm">
                      {colTitle}
                    </div>
                    <ul className="list-disc space-y-1 pl-3 text-[9px] leading-relaxed opacity-95 sm:space-y-2 sm:pl-4 sm:text-xs md:text-sm">
                      {items.map((it, idx) => (
                        <li key={idx}>{it.replace(/^-\s*/, '')}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <h3 className="border-b pb-1.5 text-xs font-bold opacity-90 sm:pb-3 sm:text-base md:text-lg lg:text-xl">
              {slide.title}
            </h3>
            <div className="my-auto grid grid-cols-2 gap-2 sm:gap-4">
              {content.map((text, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-2 text-[9px] sm:p-4 sm:text-xs md:text-sm',
                    theme.cardBg,
                  )}
                >
                  {text}
                </div>
              ))}
            </div>
          </div>
        );

      case 'agenda':
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <div>
              {slide.eyebrow && (
                <span className={cn('text-[9px] font-semibold sm:text-xs', theme.eyebrow)}>
                  {slide.eyebrow}
                </span>
              )}
              <h3 className="mt-0.5 text-sm font-extrabold tracking-tight sm:mt-1 sm:text-lg md:text-xl lg:text-2xl">
                {slide.title}
              </h3>
            </div>
            <div className="my-auto max-w-xl space-y-1.5 sm:space-y-3">
              {content.map((text, i) => (
                <div key={i} className="group flex items-center gap-1.5 sm:gap-3 md:gap-4">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold text-amber-500 sm:h-7 sm:w-7 sm:text-xs md:h-8 md:w-8 md:text-sm">
                    {i + 1}
                  </div>
                  <div className="text-xs font-semibold transition-colors group-hover:text-amber-500 sm:text-sm md:text-base">
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'split':
      default:
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <div>
              {slide.eyebrow && (
                <span className={cn('text-[9px] font-semibold sm:text-xs', theme.eyebrow)}>
                  {slide.eyebrow}
                </span>
              )}
              <h3 className="mt-0.5 text-sm font-extrabold tracking-tight sm:mt-1 sm:text-lg md:text-xl lg:text-2xl">
                {slide.title}
              </h3>
            </div>
            {visual?.url ? (
              <div
                className={cn(
                  'my-auto grid grid-cols-2 items-center gap-3 sm:gap-6 md:gap-8',
                  isRTL && 'text-right',
                )}
              >
                <div className="space-y-1.5 sm:space-y-3">
                  {content.map((text, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-1.5 text-[9px] leading-relaxed sm:gap-2.5 sm:text-xs md:text-sm',
                        isRTL && 'flex-row-reverse',
                      )}
                    >
                      <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500 sm:mt-1.5 sm:h-1.5 sm:w-1.5" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <VisualPanel visual={visual} isRTL={isRTL} />
              </div>
            ) : (
              <div className="my-auto grid grid-cols-2 items-center gap-3 sm:gap-6 md:gap-8">
                <div className="space-y-1.5 sm:space-y-3">
                  {content.slice(0, Math.ceil(content.length / 2)).map((text, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-1.5 text-[9px] leading-relaxed sm:gap-2.5 sm:text-xs md:text-sm',
                        isRTL && 'flex-row-reverse text-right',
                      )}
                    >
                      <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500 sm:mt-1.5 sm:h-1.5 sm:w-1.5" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 sm:space-y-3">
                  {content.slice(Math.ceil(content.length / 2)).map((text, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-1.5 text-[9px] leading-relaxed sm:gap-2.5 sm:text-xs md:text-sm',
                        isRTL && 'flex-row-reverse text-right',
                      )}
                    >
                      <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500 sm:mt-1.5 sm:h-1.5 sm:w-1.5" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary">
      {/* Presentation Top bar */}
      <div className="flex items-center justify-between border-b border-border-light bg-surface-primary-alt px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">{data.title}</span>
          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-xs text-text-secondary">
            {themeId.replace('nashm-', '')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium transition-colors',
              showNotes
                ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            <MessageSquare size={14} />
            Notes
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Play size={14} />
            Present
          </button>
        </div>
      </div>

      {/* Main viewport area */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto bg-surface-primary-alt p-6">
        <div
          className={cn(
            'relative aspect-[16/9] w-full max-w-3xl select-none overflow-hidden rounded-2xl border shadow-lg transition-all duration-300',
            theme.bg,
            theme.text,
            theme.border,
            theme.glow,
            isRTL && 'rtl',
          )}
          style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        >
          {currentSlide && renderSlideContent(currentSlide)}

          {/* Custom watermark / branding */}
          <div
            className={cn(
              'absolute bottom-4 text-[10px] font-semibold uppercase tracking-wider opacity-40',
              isRTL ? 'left-6' : 'right-6',
            )}
          >
            Nashm Office v1.0
          </div>
        </div>

        {/* Floating next/prev overlay */}
        <div className="mt-4 flex items-center gap-4 rounded-full border border-border-light bg-surface-primary px-4 py-1.5 text-sm text-text-primary shadow">
          <button
            onClick={prevSlide}
            disabled={activeIndex === 0}
            className="rounded-full p-1 transition-colors hover:bg-surface-hover disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="select-none font-semibold">
            {activeIndex + 1} / {slides.length}
          </span>
          <button
            onClick={nextSlide}
            disabled={activeIndex === slides.length - 1}
            className="rounded-full p-1 transition-colors hover:bg-surface-hover disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Bottom Thumbnails grid */}
      <div className="scrollbar-thin overflow-x-auto whitespace-nowrap border-t border-border-light bg-surface-primary-alt p-3">
        <div className="inline-flex gap-2">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'relative flex aspect-[16/9] w-28 shrink-0 flex-col justify-between overflow-hidden rounded border p-2 text-left text-[8px] shadow-sm transition-all duration-200',
                idx === activeIndex
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-border-medium bg-surface-primary opacity-60 hover:opacity-90',
                theme.bg,
                theme.text,
                isRTL && 'text-right',
              )}
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
            >
              <div className="w-full truncate font-bold">{slide.title || `Slide ${idx + 1}`}</div>
              <div className="mt-auto flex items-center justify-between text-[6px] opacity-60">
                <span className="uppercase">{slide.layout}</span>
                <span>{idx + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Slide Speaker notes drawer */}
      {showNotes && currentSlide?.notes && (
        <div className="max-h-[160px] overflow-y-auto border-t border-border-light bg-amber-500/5 px-6 py-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
            <MessageSquare size={13} />
            SPEAKER NOTES (SLIDE {activeIndex + 1})
          </div>
          <p className="text-sm font-medium leading-relaxed text-text-secondary">
            {currentSlide.notes}
          </p>
        </div>
      )}

      {/* Fullscreen present view */}
      {isFullscreen && (
        <div
          className={cn(
            'fixed inset-0 z-[9999] flex cursor-none flex-col items-center justify-center bg-black',
            isRTL && 'rtl',
          )}
          style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        >
          <div
            onClick={(e) => {
              // Click right side to go forward, left side to go back
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x > rect.width / 2) {
                nextSlide();
              } else {
                prevSlide();
              }
            }}
            className={cn(
              'relative aspect-[16/9] w-full max-w-6xl select-none overflow-hidden shadow-2xl transition-all duration-300',
              theme.bg,
              theme.text,
            )}
          >
            {currentSlide && renderSlideContent(currentSlide)}

            {/* Fullscreen HUD */}
            <div className="absolute inset-x-8 bottom-6 flex select-none items-center justify-between text-xs font-semibold opacity-50">
              <span>{data.title}</span>
              <span>
                {activeIndex + 1} / {slides.length}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute right-6 top-6 cursor-pointer rounded bg-white/10 px-3 py-1 text-xs text-white/50 transition-colors hover:bg-white/20 hover:text-white"
          >
            Exit Show [Esc]
          </button>
        </div>
      )}
    </div>
  );
}
