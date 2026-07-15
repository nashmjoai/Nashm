import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Play, LayoutGrid } from 'lucide-react';
import type { NashmSlides, SlideItem } from 'nashm-data-provider';
import { cn } from '~/utils';

interface SlidesPreviewProps {
  data: NashmSlides;
  direction?: 'rtl' | 'ltr' | 'auto';
}

const THEMES: Record<string, {
  bg: string;
  cardBg: string;
  text: string;
  accent: string;
  eyebrow: string;
  border: string;
  glow?: string;
}> = {
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
        setActiveIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isFullscreen]);

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

    switch (layout) {
      case 'cover':
        return (
          <div className="flex h-full flex-col justify-center px-6 py-4 sm:px-12 sm:py-8 text-center">
            {slide.eyebrow && (
              <span className={cn('mb-2 sm:mb-4 text-xs sm:text-sm font-semibold tracking-widest uppercase', theme.eyebrow)}>
                {slide.eyebrow}
              </span>
            )}
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              {slide.title}
            </h1>
            <div className="mx-auto mt-3 sm:mt-6 h-0.5 sm:h-1 w-16 sm:w-24 bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" />
            {content.length > 0 && (
              <p className="mt-3 sm:mt-6 text-xs sm:text-base md:text-lg opacity-80 max-w-2xl mx-auto">
                {content[0]}
              </p>
            )}
          </div>
        );

      case 'section':
        return (
          <div className="flex h-full flex-col justify-center px-6 py-4 sm:px-12 sm:py-8">
            {slide.eyebrow && (
              <span className={cn('mb-1.5 sm:mb-3 text-xs sm:text-sm font-semibold tracking-wider uppercase', theme.eyebrow)}>
                {slide.eyebrow}
              </span>
            )}
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">
              {slide.title}
            </h2>
            <div className="mt-2 sm:mt-4 h-1 w-12 sm:w-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded" />
            {content.length > 0 && (
              <div className="mt-3 sm:mt-6 space-y-1.5 sm:space-y-3 opacity-90">
                {content.map((text, i) => (
                  <p key={i} className="text-xs sm:text-sm md:text-base leading-relaxed">{text}</p>
                ))}
              </div>
            )}
          </div>
        );

      case 'kpi':
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <h3 className="text-xs sm:text-base md:text-lg lg:text-xl font-bold border-b pb-1.5 sm:pb-3 opacity-90">{slide.title}</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 my-auto">
              {content.map((item, i) => {
                const parts = item.split(':');
                const val = parts[0]?.trim();
                const label = parts[1]?.trim() || '';
                return (
                  <div key={i} className={cn('rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-6 border text-center transition-all duration-300', theme.cardBg)}>
                    <div className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-amber-500">{val}</div>
                    <div className="mt-0.5 sm:mt-2 text-[9px] sm:text-xs font-medium uppercase opacity-75">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="flex h-full flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10">
            <h3 className="text-xs sm:text-base md:text-lg lg:text-xl font-bold border-b pb-1.5 sm:pb-3 opacity-90">{slide.title}</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 my-auto">
              {content.map((col, i) => {
                const lines = col.split('\n').filter(Boolean);
                const colTitle = lines[0] || '';
                const items = lines.slice(1);
                return (
                  <div key={i} className={cn('rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-5 border flex flex-col h-full', theme.cardBg)}>
                    <div className="font-bold border-b pb-1 sm:pb-2 mb-1.5 sm:mb-3 text-amber-500 uppercase tracking-wide text-[10px] sm:text-xs md:text-sm">
                      {colTitle}
                    </div>
                    <ul className="space-y-1 sm:space-y-2 text-[9px] sm:text-xs md:text-sm leading-relaxed opacity-95 list-disc pl-3 sm:pl-4">
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
            <h3 className="text-xs sm:text-base md:text-lg lg:text-xl font-bold border-b pb-1.5 sm:pb-3 opacity-90">{slide.title}</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 my-auto">
              {content.map((text, i) => (
                <div key={i} className={cn('rounded-lg p-2 sm:p-4 border text-[9px] sm:text-xs md:text-sm', theme.cardBg)}>
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
              {slide.eyebrow && <span className={cn('text-[9px] sm:text-xs font-semibold', theme.eyebrow)}>{slide.eyebrow}</span>}
              <h3 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-extrabold tracking-tight mt-0.5 sm:mt-1">{slide.title}</h3>
            </div>
            <div className="space-y-1.5 sm:space-y-3 my-auto max-w-xl">
              {content.map((text, i) => (
                <div key={i} className="flex items-center gap-1.5 sm:gap-3 md:gap-4 group">
                  <div className="flex h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] sm:text-xs md:text-sm font-bold text-amber-500">
                    {i + 1}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base font-semibold group-hover:text-amber-500 transition-colors">
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
              {slide.eyebrow && <span className={cn('text-[9px] sm:text-xs font-semibold', theme.eyebrow)}>{slide.eyebrow}</span>}
              <h3 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-extrabold tracking-tight mt-0.5 sm:mt-1">{slide.title}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:gap-8 my-auto items-center">
              <div className="space-y-1.5 sm:space-y-3">
                {content.slice(0, Math.ceil(content.length / 2)).map((text, i) => (
                  <div key={i} className="flex items-start gap-1.5 sm:gap-2.5 text-[9px] sm:text-xs md:text-sm leading-relaxed">
                    <div className="mt-1 sm:mt-1.5 h-1 sm:h-1.5 w-1 sm:w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 sm:space-y-3">
                {content.slice(Math.ceil(content.length / 2)).map((text, i) => (
                  <div key={i} className="flex items-start gap-1.5 sm:gap-2.5 text-[9px] sm:text-xs md:text-sm leading-relaxed">
                    <div className="mt-1 sm:mt-1.5 h-1 sm:h-1.5 w-1 sm:w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface-primary overflow-hidden">
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
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border border-transparent',
              showNotes
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
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
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 bg-surface-primary-alt overflow-y-auto">
        <div
          className={cn(
            'relative w-full max-w-3xl aspect-[16/9] rounded-2xl border shadow-lg overflow-hidden transition-all duration-300 select-none',
            theme.bg,
            theme.text,
            theme.border,
            theme.glow,
            isRTL && 'rtl'
          )}
          style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        >
          {currentSlide && renderSlideContent(currentSlide)}

          {/* Custom watermark / branding */}
          <div className={cn('absolute bottom-4 text-[10px] opacity-40 font-semibold tracking-wider uppercase', isRTL ? 'left-6' : 'right-6')}>
            Nashm Office v1.0
          </div>
        </div>

        {/* Floating next/prev overlay */}
        <div className="mt-4 flex items-center gap-4 bg-surface-primary border border-border-light rounded-full shadow px-4 py-1.5 text-sm text-text-primary">
          <button
            onClick={prevSlide}
            disabled={activeIndex === 0}
            className="p-1 rounded-full hover:bg-surface-hover disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold select-none">
            {activeIndex + 1} / {slides.length}
          </span>
          <button
            onClick={nextSlide}
            disabled={activeIndex === slides.length - 1}
            className="p-1 rounded-full hover:bg-surface-hover disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Bottom Thumbnails grid */}
      <div className="border-t border-border-light bg-surface-primary-alt p-3 overflow-x-auto whitespace-nowrap scrollbar-thin">
        <div className="inline-flex gap-2">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'relative w-28 aspect-[16/9] rounded border flex flex-col justify-between p-2 text-[8px] overflow-hidden text-left shadow-sm shrink-0 transition-all duration-200',
                idx === activeIndex
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-border-medium bg-surface-primary opacity-60 hover:opacity-90',
                theme.bg,
                theme.text,
                isRTL && 'text-right'
              )}
              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
            >
              <div className="font-bold truncate w-full">{slide.title || `Slide ${idx + 1}`}</div>
              <div className="text-[6px] opacity-60 flex items-center justify-between mt-auto">
                <span className="uppercase">{slide.layout}</span>
                <span>{idx + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Slide Speaker notes drawer */}
      {showNotes && currentSlide?.notes && (
        <div className="border-t border-border-light bg-amber-500/5 px-6 py-4 max-h-[160px] overflow-y-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-1">
            <MessageSquare size={13} />
            SPEAKER NOTES (SLIDE {activeIndex + 1})
          </div>
          <p className="text-sm text-text-secondary leading-relaxed font-medium">
            {currentSlide.notes}
          </p>
        </div>
      )}

      {/* Fullscreen present view */}
      {isFullscreen && (
        <div className={cn('fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black cursor-none', isRTL && 'rtl')} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
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
              'w-full max-w-6xl aspect-[16/9] select-none transition-all duration-300 relative shadow-2xl overflow-hidden',
              theme.bg,
              theme.text
            )}
          >
            {currentSlide && renderSlideContent(currentSlide)}
            
            {/* Fullscreen HUD */}
            <div className="absolute bottom-6 inset-x-8 flex items-center justify-between text-xs opacity-50 font-semibold select-none">
              <span>{data.title}</span>
              <span>{activeIndex + 1} / {slides.length}</span>
            </div>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-xs text-white/50 bg-white/10 px-3 py-1 rounded hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            Exit Show [Esc]
          </button>
        </div>
      )}
    </div>
  );
}
