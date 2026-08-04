import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import {
  Paperclip,
  ArrowUp,
  ChevronRight,
  Sparkles,
  FileText,
  Code2,
  MessageSquare,
  BookOpen,
  Zap,
  Shield,
  Globe,
  BarChart3,
  X,
  Users,
  Terminal,
  GitBranch,
} from 'lucide-react';
import { ThemeSelector } from '@nashm/client';
import type { TLoginLayoutContext } from '~/common';
import useLocalize from '~/hooks/useLocalize';
import { useGetPublicPlansQuery } from '~/data-provider';

/* ─── constants for pending prompt key ──────── */
export const NASHM_PENDING_PROMPT_KEY = 'nashm_pending_prompt';

/* ─── helpers ─────────────────────────────────── */
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', h, { passive: true });
    h();
    return () => window.removeEventListener('scroll', h);
  }, [threshold]);
  return scrolled;
}

/* ─── constants ───────────────────────────────── */
const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

const QUICK_PROMPTS = [
  { icon: Sparkles, label: 'Compare top AI models side-by-side', color: 'text-amber-500 dark:text-amber-400' },
  { icon: Code2, label: 'Build a web app with interactive preview', color: 'text-fuchsia-500 dark:text-fuchsia-400' },
  { icon: FileText, label: 'Extract key insights from my PDF report', color: 'text-[#C41E3A] dark:text-[#E8344E]' },
  { icon: Globe, label: 'Research the web for live market data', color: 'text-emerald-500 dark:text-emerald-400' },
];

/* Supported AI model providers */
const AI_MODELS = [
  { name: 'Google Gemini', logo: '/assets/google.svg', color: '#4285F4' },
  { name: 'OpenAI GPT', logo: '/assets/openai.svg', color: '#10a37f' },
  { name: 'DeepSeek', logo: '/assets/deepseek.svg', color: '#4D6BFE' },
  { name: 'Mistral', logo: '/assets/mistral.png', color: '#FA8E20' },
  { name: 'Groq', logo: '/assets/groq.png', color: '#F55036' },
  { name: 'Perplexity', logo: '/assets/perplexity.png', color: '#1FB8CD' },
  { name: 'Qwen', logo: '/assets/qwen.svg', color: '#6B5CE7' },
  { name: 'Cohere', logo: '/assets/cohere.png', color: '#39594D' },
  { name: 'HuggingFace', logo: '/assets/huggingface.svg', color: '#FF9D00' },
  { name: 'Kimi', logo: '/assets/kimi.svg', color: '#1A1A1A' },
  { name: 'OpenRouter', logo: '/assets/openrouter.png', color: '#6C47FF' },
  { name: 'Together AI', logo: '/assets/together.png', color: '#0B0B0B' },
];

type FeatureCard = {
  id: string;
  label: string;
  labelAr: string;
  title: string;
  titleAr: string;
  desc: string;
  descAr: string;
  bgClass: string;
  textClass: string;
  shapeClass: string;
  colSpan: string;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'individuals',
    label: 'Explore Freely',
    labelAr: 'اكتشف بحرية',
    title: 'For Individuals',
    titleAr: 'للأفراد والمبدعين',
    desc: 'Interact with multiple AI models side-by-side. Translate text, draft content, and get immediate answers on a clean, responsive canvas.',
    descAr: 'تفاعل مع نماذج متعددة من الذكاء الاصطناعي جنباً إلى جنب. ترجم النصوص، اكتب المحتوى، واحصل على إجابات فورية في واجهة مرنة وسلسة.',
    bgClass: 'bg-[#FFEDE4] dark:bg-[#201511] border border-[#F3CFC1] dark:border-[#3D251C]/65',
    textClass: 'text-[#4F2D1E] dark:text-[#FFEDE4]',
    shapeClass: 'rounded-[64px_32px_64px_32px]',
    colSpan: 'md:col-span-7',
  },
  {
    id: 'developers',
    label: 'Code & Execute',
    labelAr: 'كتابة وتشغيل الأكواد',
    title: 'For Developers',
    titleAr: 'للمطورين والمهندسين',
    desc: 'Write, debug, and run code in an interactive sandbox. Connect with custom endpoints, APIs, and CLI tools with sub-second feedback.',
    descAr: 'اكتب البرمجيات، أصلح الأخطاء، ونفّذ الأكواد داخل بيئة برمجية تفاعلية. اربط خدماتك بواجهات البرمجة وتابع النتائج في لحظات.',
    bgClass: 'bg-[#F5F2EC] dark:bg-[#151311] border border-[#DDD3C7] dark:border-[#2C2620]',
    textClass: 'text-[#2F2924] dark:text-[#F0EAE0]',
    shapeClass: 'rounded-[32px]',
    colSpan: 'md:col-span-5',
  },
  {
    id: 'teams',
    label: 'Collaborative Workspace',
    labelAr: 'بيئة عمل تعاونية',
    title: 'For Teams',
    titleAr: 'لفرق العمل والمؤسسات',
    desc: 'Deploy custom agents, share project artifacts, and manage permissions from an integrated workspace with shared quotas and audit logs.',
    descAr: 'أنشئ عملاء مخصصين، شارك مستندات المشاريع، وأدر الصلاحيات من مساحة عمل متكاملة تتضمن حصص استهلاك مشتركة وسجلات نشاط.',
    bgClass: 'bg-[#1C1917] dark:bg-[#0C0B0A] border border-zinc-800/80 dark:border-zinc-900',
    textClass: 'text-white dark:text-[#F0EAE0]',
    shapeClass: 'rounded-[32px]',
    colSpan: 'md:col-span-5',
  },
  {
    id: 'families',
    label: 'Safe Learning',
    labelAr: 'تعليم آمن وتفاعلي',
    title: 'For Families',
    titleAr: 'للعائلات والأهالي',
    desc: 'Create secure child profiles, set up custom content filters, and explore educational prompts together. Fun, safe, and helpful for all ages.',
    descAr: 'أنشئ ملفات تعريفية آمنة للأطفال، اضبط فلاتر المحتوى المخصصة، واستكشفوا معاً المهام التعليمية المفيدة والممتعة لكل الأعمار.',
    bgClass: 'bg-[#E54E37] dark:bg-[#2A0E08] border border-[#F76A54] dark:border-[#521C11]',
    textClass: 'text-white dark:text-[#FFEDE4]',
    shapeClass: 'rounded-[32px_64px_32px_64px]',
    colSpan: 'md:col-span-7',
  },
];

type FeatureShowcase = {
  id: string;
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  image: string;
  imageAlt: string;
  imageAltAr: string;
  accent: string;
};

const FEATURE_SHOWCASES: FeatureShowcase[] = [
  {
    id: 'workspace',
    eyebrow: 'One intelligent workspace',
    eyebrowAr: 'مساحة عمل ذكية واحدة',
    title: 'Choose the right AI for every task.',
    titleAr: 'اختر الذكاء المناسب لكل مهمة.',
    description: 'Bring search, code execution, files, and the models you trust into one focused conversation.',
    descriptionAr: 'اجمع البحث وتشغيل الكود والملفات والنماذج التي تثق بها داخل محادثة واحدة مركّزة.',
    image: '/assets/features/workspace-tools.png',
    imageAlt: 'Nashm workspace with Search and Run Code tools enabled',
    imageAltAr: 'مساحة عمل نشم مع تفعيل البحث وتشغيل الكود',
    accent: 'from-[#C41E3A]/25 via-[#C41E3A]/5 to-transparent',
  },
  {
    id: 'research',
    eyebrow: 'Source-aware research',
    eyebrowAr: 'بحث موثّق بالمصادر',
    title: 'Research the web with evidence in view.',
    titleAr: 'ابحث في الويب والمصادر أمامك.',
    description: 'Nashm searches, reads, and compares sources while your answer takes shape — so every decision starts with context.',
    descriptionAr: 'يبحث نشم ويقرأ ويقارن المصادر أثناء بناء الإجابة، لتبدأ كل خطوة بسياق واضح.',
    image: '/assets/features/deep-research.png',
    imageAlt: 'Nashm deep research collecting web sources',
    imageAltAr: 'البحث العميق في نشم أثناء جمع مصادر الويب',
    accent: 'from-emerald-500/25 via-emerald-500/5 to-transparent',
  },
  {
    id: 'tools',
    eyebrow: 'Work beyond chat',
    eyebrowAr: 'أكثر من مجرد محادثة',
    title: 'Turn a prompt into work you can use.',
    titleAr: 'حوّل الطلب إلى عمل قابل للاستخدام.',
    description: 'Create slides, documents, spreadsheets, images, and code from the same place — without breaking your flow.',
    descriptionAr: 'أنشئ عروضاً ومستندات وجداول وصوراً وكوداً من المكان نفسه، من دون أن تقطع سير العمل.',
    image: '/assets/features/tools-menu.png',
    imageAlt: 'Nashm tool picker showing file search, web search, image generation, skills, code, and artifacts',
    imageAltAr: 'قائمة أدوات نشم: البحث والملفات والصور والمهارات والكود والمخرجات',
    accent: 'from-amber-400/25 via-amber-400/5 to-transparent',
  },
];

const BASE_PLANS = [
  {
    id: 'free',
    name: 'Free Plan',
    nameAr: 'الخطة المجانية',
    desc: 'For exploring what’s possible',
    descAr: 'مثالية للبدء واستكشاف الإمكانيات',
    price: '$0',
    priceDetail: 'Forever free',
    priceDetailAr: 'مجانية للأبد',
    features: [
      '100k Context Window limit',
      '50k monthly tokens quota',
      'Standard response speed',
    ],
    featuresAr: [
      'حد نافذة سياق 100k توكن',
      'رصيد شهري 50k توكن',
      'سرعة استجابة عادية',
    ],
    primary: false,
    cta: 'Sign up',
    ctaAr: 'سجل مجاناً',
  },
  {
    id: 'individual',
    name: 'Individual Plan',
    nameAr: 'الخطة الفردية',
    desc: 'For power users & daily work',
    descAr: 'للمستخدمين النشطين والعمل اليومي الفعال',
    price: '$10',
    priceDetail: 'per user / month',
    priceDetailAr: 'لكل مستخدم / شهرياً',
    features: [
      '500k Context Window limit',
      '500k monthly tokens quota',
      'Faster response times',
      'Priority support',
    ],
    featuresAr: [
      'حد نافذة سياق 500k توكن',
      'رصيد شهري 500k توكن',
      'سرعة استجابة فائقة',
      'دعم فني ذو أولوية',
    ],
    primary: true,
    cta: 'Join Individual',
    ctaAr: 'اشترك بالخطة الفردية',
  },
  {
    id: 'family',
    name: 'Family Plan',
    nameAr: 'الخطة العائلية',
    desc: 'For shared family usage',
    descAr: 'للاستخدام العائلي المشترك لجميع الأفراد',
    price: '$20',
    priceDetail: 'per family / month',
    priceDetailAr: 'للعائلة / شهرياً',
    features: [
      '1M Context Window limit',
      '1,000,000 monthly tokens quota',
      'Up to 5 family members',
      'Shared family dashboard',
    ],
    featuresAr: [
      'حد نافذة سياق 1M توكن',
      'رصيد شهري 1,000,000 توكن',
      'حتى 5 أفراد من العائلة',
      'لوحة تحكم عائلية مشتركة',
    ],
    primary: false,
    cta: 'Join Family',
    ctaAr: 'اشترك بالخطة العائلية',
  },
  {
    id: 'developer',
    name: 'Developer Plan',
    nameAr: 'خطة المطورين',
    desc: 'For professional API access',
    descAr: 'لمطورين النظم وتطوير التطبيقات البرمجية',
    price: '$40',
    priceDetail: 'per developer / month',
    priceDetailAr: 'للمطور / شهرياً',
    features: [
      '2M Context Window limit',
      '2,000,000 monthly tokens quota',
      'API & SDK Access',
      'Dedicated server processing',
    ],
    featuresAr: [
      'حد نافذة سياق 2M توكن',
      'رصيد شهري 2,000,000 توكن',
      'وصول لواجهة برمجية التطبيقات API',
      'معالجة سيرفر خاصة وفائقة السرعة',
    ],
    primary: false,
    cta: 'Join Developer',
    ctaAr: 'اشترك بخطة المطورين',
  },
];

/* ─── Model Logo Component ───────────────────── */
function ModelLogo({ model }: { model: typeof AI_MODELS[0] }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex flex-shrink-0 items-center gap-2.5 sm:gap-3 rounded-full border border-[var(--border-light)] bg-[var(--surface-secondary)]/50 backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 shadow-sm transition-all duration-300 hover:border-[#C41E3A]/40 hover:bg-[var(--surface-hover)] hover:scale-[1.05] hover:shadow-md cursor-pointer select-none group">
      {!imgError ? (
        <img
          src={model.logo}
          alt={model.name}
          className={`size-6 sm:size-7 object-contain flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
            model.name === 'Kimi' ? 'dark:invert' : ''
          }`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="size-6 sm:size-7 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-inner"
          style={{ backgroundColor: model.color }}
        />
      )}
      <span className="whitespace-nowrap text-sm sm:text-base font-bold tracking-wide text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
        {model.name}
      </span>
    </div>
  );
}

/* ─── Animated Models Strip ──────────────────── */
function ModelsStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const isPausedRef = useRef(false);

  // Duplicate the models for seamless infinite scroll
  const allModels = [...AI_MODELS, ...AI_MODELS, ...AI_MODELS];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const speed = 0.45; // px per frame - slightly faster to match dense layout

    const animate = () => {
      if (!isPausedRef.current && track) {
        posRef.current -= speed;
        const halfWidth = track.scrollWidth / 3;
        if (Math.abs(posRef.current) >= halfWidth) {
          posRef.current = 0;
        }
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden mt-12"
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
    >
      {/* Left fade mask */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[var(--surface-primary)] to-transparent" />
      {/* Right fade mask */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[var(--surface-primary)] to-transparent" />

      <div ref={trackRef} className="flex items-center gap-4 sm:gap-6 md:gap-8 py-4 sm:py-6 will-change-transform">
        {allModels.map((model, i) => (
          <ModelLogo key={`${model.name}-${i}`} model={model} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Landing Page Component ─────────────── */
export default function LandingPage() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { startupConfig } = useOutletContext<TLoginLayoutContext>();
  const rawAppTitle = startupConfig?.appTitle ?? 'Nashm';
  const appTitle = rawAppTitle.replace(/[\u0600-\u06FF]/g, '').trim() || 'NASHM';
  const registrationEnabled = startupConfig?.registrationEnabled !== false;
  const primaryPath = registrationEnabled ? '/register' : '/login';
  const primaryLabel = registrationEnabled ? 'Sign up free' : 'Log in';
  const reduceMotion = useReducedMotion() === true;

  const { data: publicPlansData } = useGetPublicPlansQuery();
  const isRTL = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';

  const backendPlans = publicPlansData?.plans || [];
  const dynamicPlans = backendPlans.length > 0
    ? backendPlans.map((bp: any) => {
        const basePlan = BASE_PLANS.find((p) => p.id.toLowerCase() === bp.plan.toLowerCase()) || BASE_PLANS[0];
        return {
          id: bp.plan,
          name: bp.displayName || basePlan.name,
          nameAr: bp.displayName || basePlan.nameAr,
          desc: bp.description || basePlan.desc,
          descAr: bp.description || basePlan.descAr,
          price: bp.priceText || basePlan.price,
          priceDetail: bp.priceText ? '' : basePlan.priceDetail,
          priceDetailAr: bp.priceText ? '' : basePlan.priceDetailAr,
          features: bp.features && bp.features.length > 0 ? bp.features : basePlan.features,
          featuresAr: bp.features && bp.features.length > 0 ? bp.features : basePlan.featuresAr,
          primary: bp.plan.toLowerCase() === 'individual',
          cta: bp.plan.toLowerCase() === 'free' ? 'Sign up' : `Join ${bp.displayName || basePlan.name}`,
          ctaAr: bp.plan.toLowerCase() === 'free' ? 'سجل مجاناً' : `اشترك في ${bp.displayName || basePlan.nameAr}`,
        };
      })
    : BASE_PLANS;

  const navScrolled = useScrolled();
  const [inputVal, setInputVal] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const WORDS = ['smarter', 'faster', 'better'];

  // Scroll Progress Bar logic
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Active Section Observer & Back to Top visibility
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    // Show back-to-top button after 500px scroll
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Intersection observer for navbar active items
    const sections = ['features', 'pricing'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setActiveSection(id);
        } else if (activeSection === id) {
          setActiveSection(null);
        }
      }, {
        rootMargin: '-30% 0px -60% 0px' // triggers when section is in upper-middle of screen
      });
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observers.forEach(obs => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, [activeSection]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace('#', '');
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 90; // offset for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  /* auto-resize textarea */
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  }, []);

  /* Handle submit — save prompt & navigate to auth */
  const handleSendMessage = useCallback(() => {
    const text = inputVal.trim();
    if (!text) return;

    // Save the pending prompt to localStorage
    localStorage.setItem(NASHM_PENDING_PROMPT_KEY, text);

    // Navigate to register/login
    navigate(primaryPath);
  }, [inputVal, navigate, primaryPath]);

  /* Handle quick prompt chip click */
  const handleQuickPrompt = useCallback((label: string) => {
    localStorage.setItem(NASHM_PENDING_PROMPT_KEY, label);
    navigate(primaryPath);
  }, [navigate, primaryPath]);

  /* Handle file attach button */
  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
    }
  }, []);

  /* Handle drag & drop */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setAttachedFileName(file.name);
  }, []);

  /* set page title */
  useEffect(() => {
    document.title = `${appTitle} — AI Workspace`;
  }, [appTitle]);

  const hasInput = inputVal.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-[#C41E3A] via-[#E8344E] to-[#FF6B6B] z-[60] origin-left shadow-[0_1px_10px_rgba(196,30,58,0.5)]"
        style={{ scaleX }}
      />

      {/* ══════════════ NAVBAR ══════════════ */}
      <header className={`fixed inset-x-0 top-3 sm:top-4 z-50 flex justify-center px-4 transition-all duration-300 ${
        navScrolled ? 'top-1.5 sm:top-2' : 'top-3 sm:top-4'
      }`}>
        <nav className={`flex h-12 sm:h-14 md:h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6 rounded-full border transition-all duration-300 ${
          navScrolled
            ? 'bg-[var(--surface-primary)]/85 backdrop-blur-xl border-[#C41E3A]/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]'
            : 'bg-[var(--surface-secondary)]/50 backdrop-blur-md border-[var(--border-light)] shadow-sm'
        }`}>
          {/* Logo & Name */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative size-10 sm:size-12 md:size-14 transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
              <img
                src="/assets/logo.png"
                alt="NASHM"
                className="size-full object-contain"
              />
            </div>
            <span className="text-base sm:text-lg md:text-[20px] font-extrabold tracking-tight text-[var(--text-primary)] group-hover:text-[#C41E3A] transition-colors duration-200">
              NASHM
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden items-center gap-4 sm:gap-6 md:gap-8 md:flex">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = activeSection === href.replace('#', '');
              return (
                <a
                  key={href}
                  href={href}
                  onClick={(e) => handleNavClick(e, href)}
                  className={`relative py-1 text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                    isActive
                      ? 'text-[#C41E3A] dark:text-[#E8344E]'
                      : 'text-[var(--text-secondary)] hover:text-[#C41E3A] dark:hover:text-[#E8344E]'
                  }`}
                >
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[#C41E3A] dark:bg-[#E8344E] shadow-[0_1px_6px_rgba(196,30,58,0.4)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex h-8 sm:h-9 items-center px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)]"
            >
              Log in
            </Link>
            <Link
              to={primaryPath}
              className="inline-flex h-8 sm:h-9 items-center rounded-full bg-[#C41E3A] px-3.5 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#C41E3A]/20 transition-all hover:bg-[#A0122A] hover:scale-[1.03] active:scale-95 duration-200"
            >
              {primaryLabel}
            </Link>
          </div>
        </nav>
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <main>
        <section className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden px-4 pt-20 pb-6">

          {/* Background */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            {/* Large center glow */}
            <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-[#C41E3A]/6 blur-[140px] dark:bg-[#C41E3A]/10" />
            {/* Bottom glow */}
            <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-violet-500/5 blur-[120px] dark:bg-violet-500/8" />
            {/* Grid */}
            <div
              className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(var(--border-light) 1px, transparent 1px), linear-gradient(90deg, var(--border-light) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
          </div>

          {/* Top spacer to push content down and keep layout balanced */}
          <div className="w-full h-10 sm:h-16 md:h-20 flex-shrink-0" />

          {/* Centered responsive Hero section container */}
          <div className="flex flex-1 flex-col items-center justify-center w-full max-w-5xl my-auto py-6 md:py-10">
            {/* ── Title ── */}
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07, duration: 0.5, ease: 'easeOut' }}
              className="text-center text-[2.2rem] sm:text-[3rem] md:text-[3.6rem] lg:text-[4.2rem] font-bold tracking-tight text-[var(--text-primary)] leading-[1.2]"
            >
              Think{' '}
              <span
                className="inline-flex relative overflow-hidden h-[1.2em] align-baseline translate-y-[0.01em] px-1"
                style={{ perspective: '800px' }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={WORDS[wordIndex]}
                    className="text-[#C41E3A] inline-flex font-extrabold whitespace-nowrap"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {WORDS[wordIndex].split('').map((char, index) => (
                      <motion.span
                        key={`${WORDS[wordIndex]}-${char}-${index}`}
                        initial={{ rotateX: 80, opacity: 0, y: 12, filter: 'blur(4px)' }}
                        animate={{ rotateX: 0, opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ rotateX: -80, opacity: 0, y: -12, filter: 'blur(4px)' }}
                        transition={{
                          duration: 0.45,
                          ease: [0.16, 1, 0.3, 1],
                          delay: index * 0.035,
                        }}
                        className="inline-block origin-center"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {char === ' ' ? '\u00A0' : char}
                      </motion.span>
                    ))}
                  </motion.span>
                </AnimatePresence>
              </span>
              <br />
              <span
                className="bg-clip-text text-transparent block mt-3 font-extrabold uppercase tracking-wide"
                style={{ backgroundImage: 'linear-gradient(135deg, #C41E3A 0%, #E8344E 50%, #FF6B6B 100%)' }}
              >
                {appTitle}
              </span>
            </motion.h1>

            {/* ══════════════ PROMPT BOX ══════════════ */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.52, ease: 'easeOut' }}
              className="mt-8 sm:mt-10 w-full max-w-[92%] sm:max-w-[580px] md:max-w-[680px] lg:max-w-[760px] transition-all duration-300"
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json"
              />

              {/* Main chat box — matches ChatForm style */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex w-full flex-col overflow-hidden rounded-3xl border pb-3 text-[var(--text-primary)] shadow-md transition-all duration-200 ${
                  isDragOver
                    ? 'border-[#C41E3A]/50 shadow-lg shadow-[#C41E3A]/10'
                    : 'border-[var(--border-light)] bg-[var(--surface-secondary)] focus-within:border-[var(--border-medium)] focus-within:shadow-lg'
                }`}
              >
                {/* Drag overlay */}
                <AnimatePresence>
                  {isDragOver && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-[#C41E3A]/5 backdrop-blur-sm border-2 border-dashed border-[#C41E3A]/40"
                    >
                      <p className="text-sm font-semibold text-[#C41E3A]">Drop your file here</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attached file chip */}
                <AnimatePresence>
                  {attachedFileName && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mx-4 mt-3"
                    >
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-light)] bg-[var(--surface-hover)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                        <FileText className="size-3 text-[#C41E3A]" />
                        <span className="max-w-[200px] truncate">{attachedFileName}</span>
                        <button
                          onClick={() => setAttachedFileName(null)}
                          className="ml-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Textarea */}
                <div className="flex items-start px-4 pt-3 sm:px-5 sm:pt-4">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputVal}
                    onChange={handleInput}
                    placeholder={`Message ${appTitle}...`}
                    className="w-full flex-1 resize-none bg-transparent text-xs sm:text-sm md:text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:text-xs sm:placeholder:text-sm outline-none focus:outline-none focus:ring-0 leading-relaxed min-h-[24px] sm:min-h-[28px] max-h-[200px] overflow-y-auto"
                    style={{ height: 28 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>

                {/* Bottom toolbar */}
                <div className="flex items-center gap-2 px-3 pt-2 sm:px-4">
                  {/* Attach file */}
                  <button
                    onClick={handleAttachClick}
                    className="flex size-7 sm:size-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                    aria-label="Attach file"
                  >
                    <Paperclip className="size-3.5 sm:size-4" />
                  </button>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Hint */}
                  <span className="hidden text-[11px] text-[var(--text-tertiary)] sm:block">
                    Press <kbd className="rounded border border-[var(--border-light)] bg-[var(--surface-hover)] px-1 py-0.5 font-mono text-[10px]">↵</kbd> to send
                  </span>

                  {/* Send button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!hasInput}
                    className={`flex size-7 sm:size-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                      hasInput
                        ? 'bg-[var(--text-primary)] text-[var(--surface-primary)] shadow-md hover:opacity-80 active:scale-95'
                        : 'bg-[var(--text-primary)] text-[var(--surface-primary)] opacity-20 cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-3.5 sm:size-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Quick prompt chips (Square Cards Grid) ── */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5, ease: 'easeOut' }}
              className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-[92%] sm:max-w-[580px] md:max-w-[680px] lg:max-w-[760px] px-2"
            >
              {QUICK_PROMPTS.map(({ icon: Icon, label, color }) => (
                <button
                  key={label}
                  onClick={() => handleQuickPrompt(label)}
                  className="group flex flex-col justify-between items-start text-left p-4 h-24 sm:h-28 rounded-2xl border border-[var(--border-light)] bg-[var(--surface-secondary)]/30 backdrop-blur-md transition-all duration-300 hover:border-[#C41E3A]/30 hover:bg-[var(--surface-hover)] hover:-translate-y-1 hover:shadow-md hover:shadow-[#C41E3A]/5 active:scale-98"
                >
                  {/* Icon at the top-left */}
                  <Icon className={`size-5 ${color} transition-transform duration-300 group-hover:scale-110`} />
                  
                  {/* Label at the bottom */}
                  <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-snug line-clamp-2">
                    {label}
                  </span>
                </button>
              ))}
            </motion.div>
          </div>

          {/* ══════════════ MODELS STRIP ══════════════ */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.5, ease: 'easeOut' }}
            className="w-full mt-auto pt-6 pb-2"
          >
            {/* Scrolling strip */}
            <ModelsStrip />
          </motion.div>
        </section>

        {/* ══════════════ FEATURES ══════════════ */}
        <section id="features" className="border-t border-[var(--border-light)] bg-[var(--surface-primary-alt)] py-24 px-4 overflow-hidden">
          <div className="mx-auto max-w-6xl">
            {/* Header section with bilingual and responsive styling */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="mb-16 text-center"
            >
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#C41E3A]/20 bg-[#C41E3A]/8 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#C41E3A]">
                <span className="size-1.5 rounded-full bg-[#C41E3A] animate-pulse" />
                {isRTL ? 'ميزات نشم' : 'Nashm capabilities'}
              </div>
              <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] md:text-5xl">
                {isRTL ? 'كل ما تحتاجه لإنجاز' : 'Everything you need to'}{' '}
                <span className="text-[#C41E3A]">{isRTL ? 'عملٍ أذكى.' : 'do smarter work.'}</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--text-secondary)] leading-relaxed md:text-base">
                {isRTL 
                  ? 'ابحث واكتب وأنشئ وحلّل داخل مساحة عمل واحدة مصممة لتبقيك في حالة تركيز.'
                  : 'Research, create, code, and analyze in one focused workspace that keeps your best tools close.'}
              </p>
            </motion.div>

            <div className="space-y-8 lg:space-y-12">
              {FEATURE_SHOWCASES.map((feature, index) => {
                const eyebrow = isRTL ? feature.eyebrowAr : feature.eyebrow;
                const title = isRTL ? feature.titleAr : feature.title;
                const description = isRTL ? feature.descriptionAr : feature.description;
                const imageAlt = isRTL ? feature.imageAltAr : feature.imageAlt;
                const mediaOrder = index % 2 === 0 ? 'lg:order-2' : 'lg:order-1';
                const contentOrder = index % 2 === 0 ? 'lg:order-1' : 'lg:order-2';

                return (
                  <motion.article
                    key={feature.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 52 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="group grid overflow-hidden rounded-[32px] border border-[var(--border-light)] bg-[var(--surface-primary)] shadow-sm lg:grid-cols-2"
                  >
                    <div className={`flex min-h-[320px] flex-col justify-between p-7 sm:p-10 lg:min-h-[460px] ${contentOrder}`}>
                      <span className="text-xs font-bold tracking-[0.16em] text-[#C41E3A]">0{index + 1} / NASHM</span>
                      <div className="max-w-md text-left rtl:text-right">
                        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C41E3A]">{eyebrow}</p>
                        <h3 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">{title}</h3>
                        <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">{description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] rtl:flex-row-reverse">
                        <span className="size-2 rounded-full bg-[#C41E3A]" />
                        {isRTL ? 'واجهة فعلية من نشم' : 'A real Nashm workflow'}
                      </div>
                    </div>
                    <div className={`relative min-h-[320px] overflow-hidden bg-[#181513] lg:min-h-[460px] ${mediaOrder}`}>
                      <img
                        src={feature.image}
                        alt={imageAlt}
                        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
                        loading="lazy"
                      />
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${feature.accent}`} />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/55 px-3.5 py-2.5 text-[10px] font-semibold text-white backdrop-blur-md rtl:flex-row-reverse">
                        <span>NASHM</span>
                        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.9)]" />{isRTL ? 'مباشر' : 'LIVE'}</span>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>

            <motion.div 
              className="hidden grid-cols-1 items-stretch gap-6 md:grid-cols-12 lg:gap-8"
              style={{ perspective: 1200 }}
            >
              {FEATURE_CARDS.map((card, i) => {
                const cardTitle = isRTL ? card.titleAr : card.title;
                const cardDesc = isRTL ? card.descAr : card.desc;
                const cardLabel = isRTL ? card.labelAr : card.label;

                return (
                  <motion.div
                    key={card.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 80, rotateX: 12, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.08 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 55, 
                      damping: 14,
                      delay: reduceMotion ? 0 : i * 0.08
                    }}
                    className={`group relative overflow-hidden flex flex-col justify-between p-6 sm:p-8 md:p-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${card.bgClass} ${card.textClass} ${card.shapeClass} ${card.colSpan}`}
                  >
                    
                    {/* Peach Card (Individuals) */}
                    {card.id === 'individuals' && (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                        <div className="flex-1 flex flex-col justify-between h-full text-left rtl:text-right max-w-sm">
                          <div>
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">
                              {cardLabel}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-3">
                              {cardTitle}
                            </h3>
                            <p className="text-xs sm:text-sm leading-relaxed opacity-85">
                              {cardDesc}
                            </p>
                          </div>
                        </div>
                        
                        {/* Interactive chat mockup */}
                        <div className="flex-1 w-full flex items-center justify-center relative min-h-[180px]">
                          <div className="w-[280px] bg-white/70 dark:bg-black/35 backdrop-blur-md border border-[#F3CFC1] dark:border-[#3D251C]/40 rounded-2xl p-4 shadow-lg flex flex-col gap-2.5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl">
                            {/* Search-bar mock */}
                            <div className="h-5 bg-white/90 dark:bg-[#2B1B15] text-[#80503D] dark:text-[#C5A89E] rounded-lg w-full flex items-center px-2 text-[8px] opacity-70 border border-[#F3CFC1]/40 dark:border-[#3D251C]/35">
                              🔍 Ask anything...
                            </div>
                            {/* Chat bubble user */}
                            <div className="bg-white dark:bg-[#2F211C] border border-[#FFDCCB]/30 dark:border-[#543325]/30 text-[#4F2D1E] dark:text-[#FFEDE4] px-3 py-1.5 rounded-xl rounded-tr-none text-[10px] text-right font-medium self-end ml-auto max-w-[85%] shadow-sm transition-transform duration-500 group-hover:translate-x-[-4px]">
                              {isRTL ? 'ترجم لي هذه الجملة إلى الإنجليزية' : 'Translate this sentence to Arabic'}
                            </div>
                            {/* Chat bubble AI */}
                            <div className="bg-[#C41E3A]/8 dark:bg-[#C41E3A]/20 border border-[#C41E3A]/15 dark:border-[#C41E3A]/30 text-[#A0122A] dark:text-[#FFA3A3] px-3 py-1.5 rounded-xl rounded-tl-none text-[10px] text-left font-medium mr-auto max-w-[85%] shadow-sm transition-transform duration-500 group-hover:translate-x-[4px]">
                              {isRTL ? 'Enjoy the beautiful journey!' : 'استمتع بالرحلة الجميلة!'}
                            </div>
                            {/* Action tags */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="bg-white/80 dark:bg-[#2B1B15] border border-[#FFDCCB] dark:border-[#543325]/50 px-2 py-1 rounded text-[8px] font-bold cursor-pointer hover:bg-[#C41E3A] hover:text-white dark:hover:bg-[#C41E3A] dark:hover:text-white transition-colors duration-200">
                                {isRTL ? '✨ تحسين' : '✨ Rewrite'}
                              </span>
                              <span className="bg-white/80 dark:bg-[#2B1B15] border border-[#FFDCCB] dark:border-[#543325]/50 px-2 py-1 rounded text-[8px] font-bold cursor-pointer hover:bg-[#C41E3A] hover:text-white dark:hover:bg-[#C41E3A] dark:hover:text-white transition-colors duration-200">
                                {isRTL ? '🌍 ترجمة' : '🌍 Translate'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Developer Card (Beige/Sand) */}
                    {card.id === 'developers' && (
                      <div className="flex flex-col justify-between h-full gap-8">
                        {/* Flowchart Mockup */}
                        <div className="w-full flex items-center justify-center relative min-h-[170px]">
                          <div className="w-[260px] h-[140px] flex flex-col justify-between items-center relative py-1">
                            {/* Lines SVG */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none text-slate-400 dark:text-zinc-600" viewBox="0 0 260 140">
                              {/* Left route */}
                              <path d="M 130 20 L 50 40 L 50 100 L 130 115" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-25" />
                              {/* Middle route */}
                              <path d="M 130 20 L 130 115" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-25" />
                              {/* Right route */}
                              <path d="M 130 20 L 210 40 L 210 100 L 130 115" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-25" />
                              
                              {/* Glowing hover dots */}
                              <motion.path 
                                d="M 130 20 L 50 40 L 50 100 L 130 115 M 130 20 L 130 115 M 130 20 L 210 40 L 210 100 L 130 115" 
                                fill="none" 
                                stroke="#C41E3A" 
                                strokeWidth="2" 
                                strokeDasharray="5 15"
                                animate={{ strokeDashoffset: [0, -30] }}
                                transition={{ repeat: Infinity, ease: "linear", duration: 1.8 }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              />
                            </svg>

                            {/* Main Task Node */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 px-3 py-1 rounded-lg text-[9px] font-bold shadow-sm z-10 flex items-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
                              <Terminal className="size-3 text-[#C41E3A]" /> Main Task
                            </div>

                            {/* Subtask Row */}
                            <div className="flex justify-between w-full px-2 z-10">
                              <div className="bg-white/70 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded text-[8px] text-slate-700 dark:text-zinc-300 shadow-sm">
                                Subtask
                              </div>
                              <div className="bg-white/70 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded text-[8px] text-slate-700 dark:text-zinc-300 shadow-sm">
                                Subtask
                              </div>
                              <div className="bg-white/70 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded text-[8px] text-slate-700 dark:text-zinc-300 shadow-sm">
                                Subtask
                              </div>
                            </div>

                            {/* Result Node */}
                            <div className="bg-[#C41E3A] text-white px-4 py-1 rounded-full text-[9px] font-bold shadow-md z-10 transition-transform duration-300 group-hover:scale-110 flex items-center gap-1">
                              <GitBranch className="size-3" /> Merged result
                            </div>
                          </div>
                        </div>

                        {/* Developer Card Text */}
                        <div className="text-left rtl:text-right mt-auto">
                          <span className="inline-block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">
                            {cardLabel}
                          </span>
                          <h3 className="text-2xl font-black tracking-tight leading-tight mb-2">
                            {cardTitle}
                          </h3>
                          <p className="text-xs leading-relaxed opacity-85">
                            {cardDesc}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Team Card (Dark/Charcoal) */}
                    {card.id === 'teams' && (
                      <div className="flex flex-col justify-between h-full gap-8">
                        {/* Interactive overlapping panels mock */}
                        <div className="w-full flex items-center justify-center relative min-h-[170px] py-2">
                          <div className="relative w-[240px] h-[130px]">
                            
                            {/* Panel 1: Terminal */}
                            <div className="absolute left-1 top-6 w-[120px] h-[80px] bg-black border border-zinc-800 rounded-lg p-2 font-mono text-[7px] text-zinc-400 select-none shadow-lg transition-all duration-500 group-hover:-translate-x-3 group-hover:translate-y-2 group-hover:rotate-[-2deg]">
                              <div className="flex items-center gap-1 mb-1 border-b border-zinc-900 pb-1">
                                <span className="size-1.5 rounded-full bg-red-500" />
                                <span className="size-1.5 rounded-full bg-amber-500" />
                                <span className="size-1.5 rounded-full bg-green-500" />
                              </div>
                              <p className="text-green-500 font-bold">$ npm run deploy</p>
                              <p className="text-[6px] opacity-75">✓ 5 agents online</p>
                              <p className="text-[6px] text-amber-500">✓ build complete (2.1s)</p>
                            </div>

                            {/* Panel 2: Browser Mock */}
                            <div className="absolute right-1 top-1 w-[130px] h-[95px] bg-zinc-900 border border-zinc-800 rounded-lg p-2 select-none shadow-2xl transition-all duration-500 group-hover:translate-x-3 group-hover:-translate-y-2 group-hover:rotate-[2deg] z-20">
                              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="size-1.5 rounded-full bg-zinc-700" />
                                  <span className="size-1.5 rounded-full bg-zinc-700" />
                                </div>
                                <div className="bg-zinc-800 text-[6px] px-2 py-0.5 rounded text-zinc-500 text-center w-[60px] truncate">
                                  nashm.ai/project
                                </div>
                                <Globe className="size-2 text-zinc-600" />
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <div className="h-2 bg-zinc-800 rounded w-4/5" />
                                <div className="h-1.5 bg-zinc-800 rounded w-full opacity-60" />
                                <div className="h-1.5 bg-zinc-800 rounded w-2/3 opacity-60" />
                                <div className="mt-1 flex items-center justify-between">
                                  <div className="h-3 w-8 bg-[#C41E3A] rounded-full" />
                                  <div className="flex -space-x-1.5">
                                    <div className="size-3.5 rounded-full bg-emerald-500 border border-zinc-900 flex items-center justify-center text-[5px] font-bold">A</div>
                                    <div className="size-3.5 rounded-full bg-amber-500 border border-zinc-900 flex items-center justify-center text-[5px] font-bold">K</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Team Card Text */}
                        <div className="text-left rtl:text-right mt-auto">
                          <span className="inline-block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">
                            {cardLabel}
                          </span>
                          <h3 className="text-2xl font-black tracking-tight leading-tight mb-2">
                            {cardTitle}
                          </h3>
                          <p className="text-xs leading-relaxed opacity-80">
                            {cardDesc}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Family Card (Orange) */}
                    {card.id === 'families' && (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                        <div className="flex-1 flex flex-col justify-between h-full text-left rtl:text-right max-w-sm">
                          <div>
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider opacity-60 mb-2">
                              {cardLabel}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-3">
                              {cardTitle}
                            </h3>
                            <p className="text-xs sm:text-sm leading-relaxed opacity-85">
                              {cardDesc}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Safe filter Mockup */}
                        <div className="flex-1 w-full flex items-center justify-center relative min-h-[180px]">
                          <div className="w-[280px] bg-white/10 dark:bg-black/25 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-lg flex flex-col gap-3 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl">
                            
                            {/* Avatar header */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-white/90">
                                {isRTL ? 'بيئة العائلة المشتركة' : 'Family Workspace'}
                              </span>
                              <div className="flex -space-x-1">
                                <span className="size-5 rounded-full bg-amber-400 border border-orange-500/20 flex items-center justify-center text-[7px] font-black text-slate-800">D</span>
                                <span className="size-5 rounded-full bg-violet-400 border border-orange-500/20 flex items-center justify-center text-[7px] font-black text-slate-800">M</span>
                                <span className="size-5 rounded-full bg-emerald-400 border border-orange-500/20 flex items-center justify-center text-[7px] font-black text-slate-800">K</span>
                              </div>
                            </div>
                            
                            {/* Toggle Row */}
                            <div className="flex items-center justify-between bg-white/15 dark:bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                              <span className="text-[9px] font-bold text-white">
                                {isRTL ? 'فلاتر حماية المحتوى' : 'Parental Content Filter'}
                              </span>
                              
                              {/* Switch mockup */}
                              <div className="w-9 h-5 rounded-full p-0.5 bg-white/30 cursor-pointer flex items-center transition-colors duration-300 group-hover:bg-emerald-500">
                                <div className="size-4 rounded-full bg-white shadow-md transform transition-transform duration-300 translate-x-0 group-hover:translate-x-4" />
                              </div>
                            </div>

                            {/* Safe Status */}
                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/90">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                              </span>
                              {isRTL ? 'حالة الحساب: آمن تماماً' : 'Status: Fully Secure'}
                              <Sparkles className="size-3 text-amber-300 ml-auto animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ══════════════ PRICING ══════════════ */}
        <section id="pricing" className="border-t border-[var(--border-light)] py-20 px-4 bg-[var(--surface-primary)]">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="mb-14 text-center"
            >
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#C41E3A]/20 bg-[#C41E3A]/8 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C41E3A]">
                <span className="size-1.5 rounded-full bg-[#C41E3A] animate-pulse" />
                Pricing
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
                Simple, transparent pricing.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-[var(--text-secondary)] leading-relaxed md:text-base">
                Start for free. Upgrade when you need more power. No hidden fees.
              </p>
            </motion.div>

            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-${Math.min(dynamicPlans.length, 4)}`}>
              {dynamicPlans.map((plan: any, i: number) => {
                const planName = isRTL ? plan.nameAr : plan.name;
                const planDesc = isRTL ? plan.descAr : plan.desc;
                const planDetail = isRTL ? plan.priceDetailAr : plan.priceDetail;
                const planFeatures = isRTL ? plan.featuresAr : plan.features;
                const featuresList = Array.isArray(planFeatures) ? planFeatures : [];
                return (
                  <motion.div
                    key={plan.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 60, scale: 0.95, rotateY: 5 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                    viewport={{ once: false, amount: 0.1 }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 65,
                      damping: 15,
                      delay: reduceMotion ? 0 : i * 0.1 
                    }}
                    className={`relative flex flex-col rounded-[32px] p-8 border transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${
                      plan.primary
                        ? 'border-[#C41E3A] bg-[var(--surface-secondary)]/85 dark:bg-[var(--surface-secondary)]/30 shadow-lg shadow-[#C41E3A]/5 ring-2 ring-[#C41E3A]/20'
                        : 'border-[var(--border-light)] bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-secondary)]/15 hover:border-[var(--border-medium)]'
                    }`}
                  >
                    {plan.primary && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#C41E3A] px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                          <Sparkles className="size-3" /> Popular
                        </span>
                      </div>
                    )}
                    
                    {/* Header */}
                    <div className="flex flex-col items-start text-left rtl:text-right w-full">
                      <h3 className="text-xl font-bold tracking-tight text-[#C41E3A] sm:text-2xl">
                        {planName}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] min-h-[36px] mt-1.5 leading-snug">
                        {planDesc}
                      </p>
                    </div>

                    {/* Price block */}
                    <div className="my-8 flex items-baseline gap-2 flex-wrap text-left rtl:text-right w-full">
                      <span className="text-4xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight">
                        {plan.price}
                      </span>
                      {planDetail && (
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-tertiary)] max-w-[140px] leading-tight">
                          {planDetail}
                        </span>
                      )}
                    </div>

                    {/* Action pill button */}
                    <Link
                      to={primaryPath}
                      className={`w-full flex h-11 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                        plan.primary
                          ? 'bg-[#C41E3A] text-white shadow-md shadow-[#C41E3A]/20 hover:bg-[#A0122A]'
                          : 'bg-[var(--text-primary)] text-[var(--surface-primary)] hover:opacity-90'
                      }`}
                    >
                      {isRTL ? plan.ctaAr || plan.cta : plan.cta}
                    </Link>

                    {/* Features list divided by thin lines */}
                    <ul className="mt-8 flex-1 flex flex-col divide-y divide-[var(--border-light)]/60 border-t border-[var(--border-light)]/60 text-left rtl:text-right w-full">
                      {featuresList.map((f: string) => (
                        <li
                          key={f}
                          className="py-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-snug"
                        >
                          <span className="size-1.5 rounded-full bg-[#C41E3A] mt-2 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════ FOOTER SECTION (Immersive & Theme-Aware) ══════════════ */}
        <footer className="relative z-10 border-t border-[var(--border-light)] bg-[var(--surface-primary-alt)] py-20 px-6 sm:px-12 md:px-16 overflow-hidden rounded-t-[48px] sm:rounded-t-[80px] shadow-2xl transition-colors duration-300">
          
          {/* Radial Ambient Glow */}
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute top-[40%] left-[80%] -translate-x-1/2 -translate-y-1/2 w-[550px] h-[450px] rounded-full bg-[#C41E3A]/5 dark:bg-[#C41E3A]/15 blur-[130px]" />
            <div className="absolute top-[60%] left-[20%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full bg-violet-600/3 dark:bg-violet-600/6 blur-[110px]" />
          </div>

          <div className="mx-auto max-w-5xl">
            {/* Asymmetrical 12-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center mb-16">
              
              {/* Left Column (col-span-7) */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="md:col-span-7 text-center md:text-left flex flex-col items-center md:items-start"
              >
                {/* Glowing Badge */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] bg-[var(--surface-secondary)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-6">
                  <Sparkles className="size-3 text-[#C41E3A] animate-pulse" />
                  The Future of AI Workspaces
                </div>
                
                {/* BIG Heading */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] mb-5 select-none text-[var(--text-primary)]">
                  Think Smarter. <br />
                  Create Faster with <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C41E3A] via-[#E8344E] to-[#FF6B6B] font-extrabold uppercase">
                    {appTitle}
                  </span>
                </h2>
                
                {/* Slogan */}
                <p className="text-[var(--text-secondary)] text-sm sm:text-base md:text-md max-w-lg leading-relaxed mb-8">
                  Unlock the power of multi-model AI routing, interactive coding artifacts, and advanced semantic document analysis in one unified dashboard.
                </p>
                
                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <Link
                    to={primaryPath}
                    className="w-full sm:w-auto inline-flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#C41E3A] to-[#E8344E] px-8 text-sm sm:text-base font-bold text-white shadow-lg shadow-[#C41E3A]/25 transition-all hover:scale-[1.05] hover:opacity-95 active:scale-95 duration-200"
                  >
                    {primaryLabel}
                    <ChevronRight className="size-4 sm:size-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-full border-2 border-[var(--border-medium)] bg-[var(--surface-primary)] px-8 text-sm sm:text-base font-bold text-[var(--text-primary)] shadow-sm transition-all hover:bg-[var(--surface-hover)] hover:border-[#C41E3A]/30 hover:scale-[1.05] active:scale-95 duration-200"
                  >
                    Log in
                  </Link>
                </div>
              </motion.div>

              {/* Right Column (col-span-5) */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="md:col-span-5 flex items-center justify-center relative py-8"
              >
                {/* Inner Orbital Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  className="absolute size-[220px] sm:size-[280px] md:size-[300px] border border-dashed border-[#C41E3A]/15 dark:border-[#C41E3A]/25 rounded-full pointer-events-none"
                />
                
                {/* Outer Orbital Ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  className="absolute size-[270px] sm:size-[340px] md:size-[360px] border border-dashed border-[var(--border-medium)]/30 rounded-full pointer-events-none"
                />
                
                {/* Gigantic Floating Logo */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="size-52 sm:size-64 md:size-72 lg:size-80 relative z-10 select-none cursor-pointer flex items-center justify-center filter drop-shadow-[0_12px_24px_rgba(196,30,58,0.15)] dark:drop-shadow-[0_16px_36px_rgba(196,30,58,0.35)]"
                >
                  <img src="/assets/logo.png" alt={appTitle} className="size-full object-contain" />
                </motion.div>
              </motion.div>
              
            </div>

            {/* Bottom Bar: Copyright and Operational status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-[var(--border-light)] pt-10 text-xs sm:text-sm text-[var(--text-tertiary)] font-medium">
              <span className="text-center sm:text-left">
                © {new Date().getFullYear()} {appTitle}. Think smarter, faster, better.
              </span>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-light)] px-4 py-1.5 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Theme Selector */}
      <div className="fixed bottom-5 left-5 z-50">
        <ThemeSelector />
      </div>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.15, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleScrollToTop}
            className="fixed bottom-5 right-5 z-50 flex size-12 items-center justify-center rounded-full bg-[var(--surface-primary)] border border-[#C41E3A]/30 text-[#C41E3A] dark:text-[#E8344E] shadow-[0_8px_24px_rgba(196,30,58,0.2)] backdrop-blur-md hover:bg-[#C41E3A] hover:text-white dark:hover:bg-[#E8344E] dark:hover:text-white hover:border-transparent transition-colors duration-300"
            aria-label={isRTL ? 'الرجوع للأعلى' : 'Scroll to top'}
          >
            <ArrowUp className="size-5 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
