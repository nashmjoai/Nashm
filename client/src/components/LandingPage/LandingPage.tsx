import { useEffect, useState, useRef, useCallback } from 'react';
import { ThemeSelector, AnthropicIcon } from '@nashm/client';
import { motion, useReducedMotion, AnimatePresence, useInView } from 'framer-motion';
import { Link, useOutletContext } from 'react-router-dom';
import { useGetPublicPlansQuery } from '~/data-provider';
import {
  Bot,
  Cpu,
  Lock,
  Users,
  Search,
  Shield,
  Ticket,
  Wallet,
  FileText,
  Database,
  Sparkles,
  Smartphone,
  Monitor,
  ArrowRight,
  Boxes,
  Workflow,
  Code2,
  FolderKanban,
  MessageSquareShare,
  BarChart3,
  LogIn,
  ChevronRight,
  MessageSquare,
  Brain,
  Settings,
  Sliders,
  Paperclip,
  Mic,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  ChevronDown,
  Copy,
  Plus,
  Bookmark,
  ArrowUp,
  Folder,
  CheckSquare,
  Trash2,
  Zap,
  Globe,
  Star,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import type { TLoginLayoutContext } from '~/common';
import type { TranslationKeys } from '~/hooks';

import useLocalize from '~/hooks/useLocalize';

type Accent = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'slate';

type LandingFeature = {
  icon: LucideIcon;
  title: TranslationKeys;
  body: TranslationKeys;
  accent: Accent;
};

type LandingPlan = {
  icon: LucideIcon;
  title: TranslationKeys | string;
  badge: TranslationKeys | string;
  body: TranslationKeys | string;
  features: string[];
  featured?: boolean;
  priceText?: string;
};



const accentClassNames: Record<Accent, string> = {
  red: 'border-[#C41E3A]/25 bg-[#C41E3A]/10 text-[#C41E3A]',
  blue: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  purple: 'border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  slate: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
};

const accentBgSolid: Record<Accent, string> = {
  red: 'bg-[#C41E3A]',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-fuchsia-500',
  slate: 'bg-zinc-500',
};

/* ── Animated counter hook ── */
function useAnimatedCounter(end: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const hasRun = useRef(false);

  useEffect(() => {
    if (!inView || hasRun.current) return;
    hasRun.current = true;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return { count, ref };
}

/* ── Scroll-reactive navbar hook ── */
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);
  return scrolled;
}

/* ── Stagger container variants ── */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

/* ── Tech providers for marquee ── */
const techProvidersPairs = [
  [
    { name: 'OpenAI', logo: '/assets/openai.svg' },
    { name: 'Gemini', logo: '/assets/google.svg' },
  ],
  [
    { name: 'Anthropic', isComponent: true, Component: AnthropicIcon, color: 'text-[#d97754] dark:text-[#e58a69]' },
    { name: 'Kimi', logo: '/assets/kimi.png' },
  ],
  [
    { name: 'Ollama', logo: '/assets/ollama.png' },
    { name: 'OpenRouter', logo: '/assets/openrouter.png' },
  ],
  [
    { name: 'Mistral', logo: '/assets/mistral.png' },
    { name: 'Cohere', logo: '/assets/cohere.png' },
  ],
  [
    { name: 'Perplexity', logo: '/assets/perplexity.png' },
    { name: 'Together AI', logo: '/assets/together.png' },
  ],
  [
    { name: 'Groq', logo: '/assets/groq.png' },
    { name: 'Azure', logo: '/assets/azure-ai-search.svg' },
  ],
];

const techProviders = techProvidersPairs.flat().map((p) => p.name);

const marqueeVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    }
  }
};

const makePairVariant = () => ({
  hidden: {
    opacity: 0,
    y: 0,
    x: -150, // Move from left to right
    scale: 1,
  },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 140,
      damping: 11,
      mass: 0.9,
    }
  }
});



const trustItems: LandingFeature[] = [
  {
    icon: Shield,
    title: 'com_landing_trust_secure_title',
    body: 'com_landing_trust_secure_body',
    accent: 'red',
  },
  {
    icon: Workflow,
    title: 'com_landing_trust_workflows_title',
    body: 'com_landing_trust_workflows_body',
    accent: 'blue',
  },
  {
    icon: Wallet,
    title: 'com_landing_trust_billing_title',
    body: 'com_landing_trust_billing_body',
    accent: 'green',
  },
];

const features: LandingFeature[] = [
  {
    icon: Bot,
    title: 'com_landing_feature_models_title',
    body: 'com_landing_feature_models_body',
    accent: 'blue',
  },
  {
    icon: FileText,
    title: 'com_landing_feature_files_title',
    body: 'com_landing_feature_files_body',
    accent: 'green',
  },
  {
    icon: Code2,
    title: 'com_landing_feature_artifacts_title',
    body: 'com_landing_feature_artifacts_body',
    accent: 'purple',
  },
  {
    icon: Database,
    title: 'com_landing_feature_mcp_title',
    body: 'com_landing_feature_mcp_body',
    accent: 'amber',
  },
  {
    icon: FolderKanban,
    title: 'com_landing_feature_projects_title',
    body: 'com_landing_feature_projects_body',
    accent: 'slate',
  },
  {
    icon: Search,
    title: 'com_landing_feature_search_title',
    body: 'com_landing_feature_search_body',
    accent: 'red',
  },
  {
    icon: Boxes,
    title: 'com_landing_feature_agents_title',
    body: 'com_landing_feature_agents_body',
    accent: 'blue',
  },
  {
    icon: MessageSquareShare,
    title: 'com_landing_feature_sharing_title',
    body: 'com_landing_feature_sharing_body',
    accent: 'green',
  },
];

const differentiators: LandingFeature[] = [
  {
    icon: Cpu,
    title: 'com_landing_difference_provider_title',
    body: 'com_landing_difference_provider_body',
    accent: 'blue',
  },
  {
    icon: Sparkles,
    title: 'com_landing_difference_artifacts_title',
    body: 'com_landing_difference_artifacts_body',
    accent: 'purple',
  },
  {
    icon: Users,
    title: 'com_landing_difference_family_title',
    body: 'com_landing_difference_family_body',
    accent: 'green',
  },
  {
    icon: BarChart3,
    title: 'com_landing_difference_admin_title',
    body: 'com_landing_difference_admin_body',
    accent: 'red',
  },
];

const plans: LandingPlan[] = [
  {
    icon: Sparkles,
    title: 'com_landing_plan_free_title',
    badge: 'com_landing_plan_free_badge',
    body: 'com_landing_plan_free_body',
    features: [
      'com_landing_plan_free_feature_one',
      'com_landing_plan_free_feature_two',
      'com_landing_plan_free_feature_three',
    ],
  },
  {
    icon: Bot,
    title: 'com_landing_plan_individual_title',
    badge: 'com_landing_plan_individual_badge',
    body: 'com_landing_plan_individual_body',
    features: [
      'com_landing_plan_individual_feature_one',
      'com_landing_plan_individual_feature_two',
      'com_landing_plan_individual_feature_three',
    ],
    featured: true,
  },
  {
    icon: Users,
    title: 'com_landing_plan_family_title',
    badge: 'com_landing_plan_family_badge',
    body: 'com_landing_plan_family_body',
    features: [
      'com_landing_plan_family_feature_one',
      'com_landing_plan_family_feature_two',
      'com_landing_plan_family_feature_three',
    ],
  },
  {
    icon: Code2,
    title: 'com_landing_plan_developer_title',
    badge: 'com_landing_plan_developer_badge',
    body: 'com_landing_plan_developer_body',
    features: [
      'com_landing_plan_developer_feature_one',
      'com_landing_plan_developer_feature_two',
      'com_landing_plan_developer_feature_three',
    ],
  },
];

const sceneModels: TranslationKeys[] = [
  'com_landing_mock_model_gpt',
  'com_landing_mock_model_gemini',
  'com_landing_mock_model_kimi',
];

const scenePlans: Array<{ name: TranslationKeys; value: TranslationKeys }> = [
  { name: 'com_landing_mock_plan_free', value: 'com_landing_mock_plan_free_value' },
  { name: 'com_landing_mock_plan_individual', value: 'com_landing_mock_plan_individual_value' },
  { name: 'com_landing_mock_plan_family', value: 'com_landing_mock_plan_family_value' },
  { name: 'com_landing_mock_plan_developer', value: 'com_landing_mock_plan_developer_value' },
];

const adminStats: Array<{ label: TranslationKeys; value: string }> = [
  { label: 'com_landing_admin_mock_users', value: '1,284' },
  { label: 'com_landing_admin_mock_sessions', value: '312' },
  { label: 'com_landing_admin_mock_tokens', value: '8.6M' },
  { label: 'com_landing_admin_mock_tickets', value: '24' },
];

const adminModels: TranslationKeys[] = [
  'com_landing_admin_mock_model_gemini',
  'com_landing_admin_mock_model_kimi',
  'com_landing_admin_mock_model_agents',
];

const adminHighlights: LandingFeature[] = [
  {
    icon: Lock,
    title: 'com_landing_admin_security_title',
    body: 'com_landing_admin_security_body',
    accent: 'red',
  },
  {
    icon: Ticket,
    title: 'com_landing_admin_support_title',
    body: 'com_landing_admin_support_body',
    accent: 'amber',
  },
];

/* ── Interactive Prompt Builder ── */
interface InteractivePromptBuilderProps {
  reduceMotion: boolean;
}

function InteractivePromptBuilder({ reduceMotion }: InteractivePromptBuilderProps) {
  const isRTL = document.documentElement.dir === 'rtl';
  const [activeTab, setActiveTab] = useState<'website' | 'mobile' | 'design' | 'data' | 'coding'>('website');
  const [inputValue, setInputValue] = useState('');

  const defaultPrompts = {
    website: isRTL ? 'أنشئ موقعاً إلكترونياً لـ...' : 'Build a website for...',
    mobile: isRTL ? 'أنشئ تطبيق جوال لـ...' : 'Build a mobile app for...',
    design: isRTL ? 'صمم واجهة مستخدم لـ...' : 'Design a user interface for...',
    data: isRTL ? 'حلل هذا المستند لـ...' : 'Analyze this document for...',
    coding: isRTL ? 'اكتب كوداً لـ...' : 'Write a code to...',
  };

  const suggestions = {
    website: isRTL
      ? ['متعقب الجري للمبتدئين', 'لوحة تحكم إحصائيات SaaS', 'لعبة منصات ثلاثية الأبعاد']
      : ['Beginner running tracker', 'SaaS KPI dashboard', '3D puzzle platformer'],
    mobile: isRTL
      ? ['تطبيق تتبع العادات', 'صفحة دفع متجر إلكتروني', 'واجهة تطبيق محادثة']
      : ['Habit tracker app', 'E-commerce checkout', 'Chat messenger UI'],
    design: isRTL
      ? ['لوحة تحليلات بالوضع الداكن', 'بطاقة إعدادات زجاجية', 'حاسبة بتصميم نيومورفيك']
      : ['Dark mode analytics panel', 'Glassmorphic settings card', 'Neumorphic calculator'],
    data: isRTL
      ? ['تحليل مبيعات إكسل الشهرية', 'تلخيص عقد بصيغة PDF', 'تنظيف قاعدة بيانات CSV']
      : ['Analyze monthly sales Excel', 'Summarize PDF contract', 'Clean up CSV database'],
    coding: isRTL
      ? ['برنامج سحب بيانات بالبايثون', 'سيرفر API بلغة Node', 'مخطط قاعدة بيانات SQL']
      : ['Python web scraper script', 'REST API server in Node', 'SQL database schema'],
  };

  const handleTabChange = (tab: 'website' | 'mobile' | 'design' | 'data' | 'coding') => {
    setActiveTab(tab);
    setInputValue('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Glow behind card */}
      <div className="nashm-chat-glow" />

      {/* Floating Card */}
      <div className="nashm-chat-visual bg-white dark:bg-[#111111] p-6 flex flex-col justify-between min-h-[380px]">
        {/* Window chrome header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06] mb-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              <span className="nashm-pulse-ring text-[#C41E3A]" />
              <span className="relative rounded-full h-2 w-2 bg-[#C41E3A]" />
            </span>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">app.nashm.ai</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C41E3A] bg-[#C41E3A]/08 dark:bg-[#C41E3A]/12 border border-[#C41E3A]/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />
            {isRTL ? 'نشم AI' : 'Nashm AI'}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
            {isRTL ? 'ماذا تريد أن تبني مع نشم؟' : 'What will you build with Nashm?'}
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {isRTL ? 'حوّل أفكارك إلى تطبيقات ومستندات في ثوانٍ' : 'Turn ideas into apps and analyses in seconds'}
          </p>

          {/* Prompt Input Box */}
          <div className="w-full relative flex items-center mb-6">
            <div className="absolute left-3.5 text-zinc-400">
              <Plus className="w-4 h-4 cursor-pointer hover:text-[#C41E3A] transition-colors" />
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={defaultPrompts[activeTab]}
              className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#0a0a0a] text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#C41E3A] focus:border-[#C41E3A] shadow-sm transition-all"
            />
            <Link
              to="/register"
              className="absolute right-2.5 w-9 h-9 rounded-lg bg-[#C41E3A] flex items-center justify-center shadow-md shadow-[#C41E3A]/25 hover:bg-[#a91831] transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {[
              { id: 'website', label: isRTL ? 'موقع ويب' : 'Website', icon: Monitor },
              { id: 'mobile', label: isRTL ? 'تطبيق جوال' : 'Mobile', icon: Smartphone },
              { id: 'design', label: isRTL ? 'تصميم UI' : 'Design', icon: Sparkles },
              { id: 'data', label: isRTL ? 'ملفات وبيانات' : 'Data & Files', icon: Database },
              { id: 'coding', label: isRTL ? 'برمجة وكود' : 'Coding', icon: Code2 },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${isActive
                      ? 'border-[#C41E3A] bg-[#C41E3A]/10 text-[#C41E3A]'
                      : 'border-black/[0.06] dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-900/50 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Suggestion Chips */}
          <div className="w-full text-start">
            <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-2.5 px-1">
              {isRTL ? 'جرب أحد الأمثلة التالية:' : 'Try an example prompt:'}
            </p>
            <div className="flex flex-col gap-2">
              {suggestions[activeTab].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(sug)}
                  className="w-full text-start px-3 py-2 text-xs rounded-lg border border-black/[0.05] dark:border-white/[0.05] bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-355 hover:bg-[#C41E3A]/5 hover:border-[#C41E3A]/20 hover:text-[#C41E3A] dark:hover:text-red-300 transition-all truncate"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge chips */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute -left-4 top-12 hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#111] border border-black/[0.07] dark:border-white/[0.07] shadow-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300"
      >
        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Zap className="w-3 h-3 text-emerald-500" />
        </span>
        {isRTL ? '٪٩٩.٩ وقت التشغيل' : '99.9% Uptime'}
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="absolute -right-4 bottom-20 hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#111] border border-black/[0.07] dark:border-white/[0.07] shadow-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300"
      >
        <span className="w-6 h-6 rounded-full bg-[#C41E3A]/10 border border-[#C41E3A]/20 flex items-center justify-center">
          <Star className="w-3 h-3 text-[#C41E3A]" />
        </span>
        {isRTL ? '١٢+ نموذج ذكاء' : '12+ AI Models'}
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="absolute -bottom-4 left-8 hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#111] border border-black/[0.07] dark:border-white/[0.07] shadow-lg text-[11px] font-semibold text-zinc-700 dark:text-zinc-300"
      >
        <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Globe className="w-3 h-3 text-blue-500" />
        </span>
        {isRTL ? 'عربي وإنجليزي' : 'Arabic & English'}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   OLD ShowcaseDashboard (kept for plans/admin sections)
   ═══════════════════════════════════════════════ */
interface ShowcaseDashboardProps {
  reduceMotion: boolean;
}

function ShowcaseDashboard({ reduceMotion }: ShowcaseDashboardProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'artifacts' | 'admin'>('artifacts');
  const [autoplay, setAutoplay] = useState(true);
  const autoplayTimer = useRef<NodeJS.Timeout | null>(null);
  const isRTL = document.documentElement.dir === 'rtl';

  const [sidebarTab, setSidebarTab] = useState<'chat' | 'skills' | 'prompts' | 'memory'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'Gemini 3.5 Flash' | 'GPT-4o Reasoning' | 'Claude 3.5 Sonnet'>('Gemini 3.5 Flash');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [routingStatus, setRoutingStatus] = useState<string>('');

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; model?: string; latency?: string }>>([
    {
      sender: 'ai',
      text: isRTL
        ? 'مرحباً بك في نشم! كيف يمكنني مساعدتك اليوم؟ اختر أحد الاقتراحات الجاهزة أو اكتب استفسارك لتجربة توجيه النماذج الذكي.'
        : 'Welcome to Nashm! How can I help you today? Choose one of the quick suggestions below or type your query to test our smart model routing.',
    }
  ]);

  useEffect(() => {
    if (!autoplay || reduceMotion) return;
    autoplayTimer.current = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === 'chat') return 'artifacts';
        if (prev === 'artifacts') return 'admin';
        return 'chat';
      });
    }, 12000);
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    };
  }, [autoplay, reduceMotion]);

  const selectTab = (tab: 'chat' | 'artifacts' | 'admin') => {
    setAutoplay(false);
    setActiveTab(tab);
  };

  const handleQuickPrompt = (promptText: string) => {
    setAutoplay(false);
    if (isTyping) return;
    submitQuery(promptText);
  };

  const handleSend = () => {
    setAutoplay(false);
    if (!chatInput.trim() || isTyping) return;
    submitQuery(chatInput);
    setChatInput('');
  };

  const submitQuery = (text: string) => {
    const userMsg = { sender: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setRoutingStatus(isRTL ? 'جاري التوجيه للنموذج الأمثل...' : 'Routing query to optimal model...');

    setTimeout(() => {
      let aiText = '';
      let routedModel = 'Gemini 3.5 Flash';
      let latency = '180ms';

      if (text.toLowerCase().includes('design') || text.includes('تصميم')) {
        routedModel = 'GPT-4o Reasoning';
        latency = '320ms';
        aiText = isRTL
          ? 'لقد قمت بتوليد قالب لوحة المعلومات التفاعلية بنجاح. اضغط على علامة تبويب "Artifacts" لمشاهدة النتيجة!'
          : 'I have designed a fully interactive dashboard component for you. Click the "Artifacts" tab to preview the live result!';
      } else if (text.toLowerCase().includes('quantum') || text.includes('كم')) {
        routedModel = 'Gemini 3.5 Flash';
        latency = '145ms';
        aiText = isRTL
          ? 'الحوسبة الكمومية تعتمد على الكيوبت (Qubit) الذي يستفيد من ظاهرتي التراكب والتشابك الكمي.'
          : 'Quantum computing uses qubits that exploit superposition and entanglement to solve complex problems exponentially faster.';
      } else {
        routedModel = selectedModel;
        latency = '210ms';
        aiText = isRTL
          ? `أهلاً بك! تم توجيه استفسارك إلى نموذج ${routedModel} لضمان أسرع استجابة وأعلى دقة ممكنة.`
          : `Hello! Your query has been routed to ${routedModel} for the fastest and most accurate response.`;
      }

      setRoutingStatus(isRTL ? `تم التوجيه لـ ${routedModel} في ${latency}` : `Routed to ${routedModel} in ${latency}`);
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'ai', text: aiText, model: routedModel, latency }]);

      if (text.toLowerCase().includes('design') || text.includes('تصميم')) {
        setTimeout(() => setActiveTab('artifacts'), 4000);
      }
    }, 1500);
  };

  const quickPrompts = isRTL
    ? [
      { label: '🎨 تصميم واجهة مستخدم', query: 'تصميم واجهة مستخدم لوحة تحكم حديثة وتفاعلية' },
      { label: '⚛️ شرح ميكانيكا الكم', query: 'اشرح ميكانيكا الكم ببساطة' },
      { label: '📊 تحليل إحصائيات النظام', query: 'أعطني إحصائيات النظام الحالية' }
    ]
    : [
      { label: '🎨 Design a Dashboard UI', query: 'Design a modern dashboard UI component' },
      { label: '⚛️ Quantum Computing', query: 'Explain quantum computing simply' },
      { label: '📊 System Stats Analysis', query: 'Give me system stats analysis' }
    ];

  const themeClass = 'bg-white dark:bg-[#111111] text-zinc-800 dark:text-zinc-200';

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 px-2 relative z-20">
      {/* Premium Tab switcher */}
      <div className="flex justify-center gap-3 mb-10 flex-wrap">
        {(['chat', 'artifacts', 'admin'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`relative flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-full transition-all duration-300 border ${activeTab === tab
                ? 'bg-[#C41E3A] border-[#C41E3A] text-white shadow-[0_0_20px_rgba(196,30,58,0.4)] scale-105'
                : 'bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
          >
            {tab === 'chat' && (
              <>
                <MessageSquare className={`size-4 ${activeTab === 'chat' ? 'text-white' : 'text-zinc-400'}`} />
                {isRTL ? 'محادثة نشم' : 'Nashm AI Chat'}
              </>
            )}
            {tab === 'artifacts' && (
              <>
                <Code2 className={`size-4 ${activeTab === 'artifacts' ? 'text-white' : 'text-purple-400'}`} />
                {isRTL ? 'معاينة (Artifacts)' : 'Sandbox Artifacts'}
              </>
            )}
            {tab === 'admin' && (
              <>
                <Shield className={`size-4 ${activeTab === 'admin' ? 'text-white' : 'text-blue-500'}`} />
                {isRTL ? 'لوحة الإدارة' : 'Admin Console'}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Stunning Browser mockup */}
      <div className={`rounded-2xl border shadow-2xl overflow-hidden transform-gpu transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(196,30,58,0.3)] border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0A0A0A]`}>
        {/* macOS premium header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b bg-zinc-100 dark:bg-[#141414] border-black/5 dark:border-white/5`}>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <span className="size-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="size-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </div>
          <div className={`border text-[10px] px-10 py-1 rounded-lg font-mono tracking-wider select-none truncate max-w-xs transition-colors duration-300 bg-white dark:bg-black border-black/5 dark:border-white/10 text-zinc-500 shadow-inner`}>
            https://app.nashm.ai
          </div>
          <div className="w-[52px]"></div> {/* Spacer for centering */}
        </div>

        {/* Tab render area */}
        <div className={`relative overflow-hidden min-h-[500px] transition-colors duration-500 ${themeClass}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex h-full absolute inset-0"
            >
              {/* AI CHAT TAB */}
              {activeTab === 'chat' && (
                <div className="flex w-full h-[500px] overflow-hidden">
                  <div className={`w-16 border-e flex flex-col justify-between items-center py-5 bg-zinc-50 dark:bg-[#0F0F0F] border-black/5 dark:border-white/5`}>
                    <div className="flex flex-col gap-6 items-center w-full">
                      <button onClick={() => setSidebarOpen(prev => !prev)} className="p-2 rounded-xl text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
                      </button>
                      {(['chat', 'skills', 'prompts', 'memory'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => { setSidebarTab(tab); setSidebarOpen(true); }}
                          className={`p-2.5 rounded-xl transition-all ${sidebarTab === tab && sidebarOpen
                              ? 'bg-[#C41E3A] text-white shadow-lg shadow-[#C41E3A]/40'
                              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                          {tab === 'chat' && <MessageSquare className="size-4.5" />}
                          {tab === 'skills' && <Bot className="size-4.5" />}
                          {tab === 'prompts' && <FileText className="size-4.5" />}
                          {tab === 'memory' && <Brain className="size-4.5" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-5 items-center">
                      <Sliders className="size-5 text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer" />
                      <div className="size-8 rounded-full bg-gradient-to-br from-[#C41E3A] to-red-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#C41E3A]/30 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-[#0F0F0F] select-none shadow-lg shadow-red-500/20">AA</div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 240, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`border-e flex flex-col h-[500px] overflow-hidden text-sm bg-zinc-100 dark:bg-[#121212] border-black/5 dark:border-white/5`}
                      >
                        <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
                          {sidebarTab === 'chat' && (
                            <div className="flex flex-col gap-5 h-full">
                              <div className="flex items-center gap-2 px-1">
                                <span className="size-2.5 rounded-full bg-[#C41E3A] animate-pulse shadow-[0_0_10px_rgba(196,30,58,0.8)]" />
                                <span className="text-xs font-extrabold tracking-widest uppercase text-black dark:text-white">{isRTL ? 'نشم' : 'NASHM'}</span>
                              </div>
                              <div className="bg-[#C41E3A] text-white text-xs font-bold py-2.5 px-4 rounded-xl text-center cursor-pointer transition-all hover:bg-[#a91831] shadow-lg shadow-[#C41E3A]/20 hover:shadow-[#C41E3A]/40 flex items-center justify-center gap-2">
                                <Plus className="size-3.5" />
                                {isRTL ? 'محادثة جديدة' : 'New Chat'}
                              </div>
                              <div className="space-y-1.5 mt-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-2">Today</div>
                                <div className="p-2.5 rounded-lg font-semibold text-start truncate cursor-pointer bg-[#C41E3A]/15 text-[#C41E3A] border border-[#C41E3A]/20">
                                  💬 {isRTL ? 'توجيه النماذج الذكي' : 'Model Routing Plan'}
                                </div>
                                <div className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg truncate cursor-pointer text-zinc-600 dark:text-zinc-400 transition-colors">
                                  📄 {isRTL ? 'إحصائيات الموارد' : 'Resource Stats'}
                                </div>
                                <div className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg truncate cursor-pointer text-zinc-600 dark:text-zinc-400 transition-colors">
                                  ⚙️ {isRTL ? 'تخصيص الصلاحيات' : 'Permissions'}
                                </div>
                              </div>
                            </div>
                          )}
                          {sidebarTab !== 'chat' && (
                            <div className="flex flex-col h-full justify-center items-center gap-3 text-zinc-600">
                              {sidebarTab === 'skills' && <Bot className="size-10" />}
                              {sidebarTab === 'prompts' && <FileText className="size-10" />}
                              {sidebarTab === 'memory' && <Brain className="size-10" />}
                              <p className="text-xs font-semibold">
                                {isRTL ? 'لا يوجد محتوى بعد' : 'Nothing here yet'}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main chat */}
                  <div className="flex-1 flex flex-col justify-between p-4 relative h-[500px]">
                    <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.05] dark:opacity-20 pointer-events-none mix-blend-overlay"></div>
                    <div className={`flex items-center justify-between border-b pb-4 text-sm z-30 border-black/5 dark:border-white/5`}>
                      <div className="relative">
                        <button
                          onClick={() => setModelDropdownOpen(prev => !prev)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-[#1A1A1A] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-[#222] transition-colors shadow-sm font-semibold"
                        >
                          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          <span className="text-xs">{selectedModel}</span>
                          <ChevronDown className="size-4 opacity-50 ms-1" />
                        </button>
                        {modelDropdownOpen && (
                          <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border shadow-2xl z-50 overflow-hidden bg-white dark:bg-[#1A1A1A] border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200">
                            {(['Gemini 3.5 Flash', 'GPT-4o Reasoning', 'Claude 3.5 Sonnet'] as const).map((m) => (
                              <div key={m} onClick={() => { setSelectedModel(m); setModelDropdownOpen(false); }} className="px-4 py-3 text-xs font-medium cursor-pointer hover:bg-[#C41E3A] hover:text-white transition-colors flex items-center gap-2">
                                <span>{m === 'Gemini 3.5 Flash' ? '🤖' : m === 'GPT-4o Reasoning' ? '🧠' : '🚀'}</span>
                                {m}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <img src="/assets/logo.png" alt="Nashm" className="size-7 object-contain opacity-80 mix-blend-screen" />
                    </div>

                    <div className="flex-1 overflow-y-auto py-6 space-y-6 text-sm nashm-mini-scroll px-2 relative z-10">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-2xl px-5 py-3 max-w-[80%] text-start shadow-md text-sm leading-relaxed ${msg.sender === 'user'
                              ? 'bg-gradient-to-br from-[#C41E3A] to-red-600 border border-red-500/50 text-white rounded-tr-sm shadow-red-500/20'
                              : 'bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 rounded-tl-sm'
                            }`}>
                            <p>{msg.text}</p>
                            {msg.model && (
                              <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-black/20 w-fit px-2 py-1 rounded-md">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {isRTL ? `موجه عبر ${msg.model} (${msg.latency})` : `Routed via ${msg.model} (${msg.latency})`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl rounded-tl-sm w-fit border bg-white dark:bg-[#1A1A1A] border-black/5 dark:border-white/5 shadow-md">
                          <div className="flex gap-1.5">
                            <span className="size-1.5 rounded-full bg-[#C41E3A] animate-bounce" />
                            <span className="size-1.5 rounded-full bg-[#C41E3A] animate-bounce [animation-delay:0.2s]" />
                            <span className="size-1.5 rounded-full bg-[#C41E3A] animate-bounce [animation-delay:0.4s]" />
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">{routingStatus}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 z-20">
                      {messages.length === 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 nashm-mini-scroll">
                          {quickPrompts.map((tag, i) => (
                            <button key={i} onClick={() => handleQuickPrompt(tag.query)}
                              className="px-4 py-2 rounded-xl border whitespace-nowrap text-xs font-medium transition-all hover:-translate-y-0.5 bg-white dark:bg-[#1A1A1A] border-black/10 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:border-[#C41E3A]/60 dark:hover:border-[#C41E3A]/60 hover:text-[#C41E3A] dark:hover:text-white shadow-lg">
                              {tag.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="w-full border rounded-2xl p-3 flex items-center gap-3 bg-white dark:bg-[#161616] border-black/10 dark:border-white/10 shadow-xl focus-within:border-[#C41E3A]/60 focus-within:ring-1 focus-within:ring-[#C41E3A]/30 transition-all">
                        <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                          <Paperclip className="size-4" />
                        </button>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                          placeholder={isRTL ? `رسالة إلى نشم...` : `Message Nashm...`}
                          className="bg-transparent outline-none flex-1 text-sm text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        />
                        <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                          <Mic className="size-4" />
                        </button>
                        <button onClick={handleSend} className="size-9 rounded-xl bg-gradient-to-br from-[#C41E3A] to-red-600 hover:to-red-500 flex items-center justify-center text-white transition-all shadow-lg shadow-[#C41E3A]/30 hover:scale-105 active:scale-95">
                          <ArrowUp className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ARTIFACTS TAB */}
              {activeTab === 'artifacts' && (
                <div className="flex w-full h-[500px] overflow-hidden bg-zinc-50 dark:bg-[#0A0A0A]">
                  <div className="w-[45%] border-e border-black/5 dark:border-white/5 p-0 hidden sm:flex flex-col text-[12px] font-mono bg-zinc-100 dark:bg-[#0D0D0D]">
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 px-6 py-3.5 bg-zinc-200 dark:bg-[#121212]">
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-700 dark:text-zinc-300">dashboard_view.tsx</span>
                      </div>
                      <span className="font-sans font-bold text-[10px] tracking-widest uppercase text-zinc-500">Typescript</span>
                    </div>
                    <div className="p-6 space-y-1.5 overflow-y-auto leading-[1.6] flex-1 text-start">
                      <div><span className="text-purple-600 dark:text-[#F92672] font-semibold">import</span> &#123; <span className="text-blue-600 dark:text-[#A6E22E]">LineChart</span> &#125; <span className="text-purple-600 dark:text-[#F92672] font-semibold">from</span> <span className="text-green-600 dark:text-[#E6DB74]">"@nashm/ui"</span>;</div>
                      <br/>
                      <div><span className="text-blue-600 dark:text-[#66D9EF] font-semibold">const</span> <span className="text-orange-600 dark:text-[#FD971F]">stats</span> <span className="text-purple-600 dark:text-[#F92672]">=</span> [</div>
                      <div className="ps-6">&#123; label: <span className="text-green-600 dark:text-[#E6DB74]">'API Requests'</span>, value: <span className="text-pink-600 dark:text-[#AE81FF]">1284</span> &#125;,</div>
                      <div className="ps-6">&#123; label: <span className="text-green-600 dark:text-[#E6DB74]">'Success Rate'</span>, value: <span className="text-pink-600 dark:text-[#AE81FF]">99.8</span> &#125;</div>
                      <div>];</div>
                      <br/>
                      <div><span className="text-purple-600 dark:text-[#F92672] font-semibold">export default function</span> <span className="text-blue-600 dark:text-[#A6E22E]">Dashboard</span>() &#123;</div>
                      <div className="ps-6"><span className="text-purple-600 dark:text-[#F92672] font-semibold">return</span> (</div>
                      <div className="ps-10">&lt;<span className="text-purple-600 dark:text-[#F92672]">div</span> className=<span className="text-green-600 dark:text-[#E6DB74]">"grid gap-4"</span>&gt;</div>
                      <div className="ps-14">&lt;<span className="text-blue-600 dark:text-[#A6E22E]">LineChart</span> data=&#123;<span className="text-orange-600 dark:text-[#FD971F]">stats</span>&#125; color=<span className="text-green-600 dark:text-[#E6DB74]">"#C41E3A"</span> /&gt;</div>
                      <div className="ps-10">&lt;/<span className="text-purple-600 dark:text-[#F92672]">div</span>&gt;</div>
                      <div className="ps-6">);</div>
                      <div>&#125;</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col bg-white dark:bg-[#111111] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#C41E3A]/5 to-transparent opacity-50 pointer-events-none"></div>
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 px-6 py-3.5 z-10 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="text-[11px] font-bold tracking-wide uppercase text-zinc-700 dark:text-zinc-300">{isRTL ? 'معاينة حية' : 'Live Sandbox'}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#C41E3A]/10 border border-[#C41E3A]/30 text-[#C41E3A] px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        <Zap className="size-3 fill-[#C41E3A]" />
                        {isRTL ? 'تحديث تلقائي' : 'Auto-Sync'}
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center items-center p-8 z-10 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#C41E3A]/10 blur-[80px] rounded-full pointer-events-none" />
                      
                      <div className="w-full max-w-[420px] p-6 rounded-2xl bg-zinc-50 dark:bg-[#161616] border border-black/5 dark:border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex justify-between items-end mb-8 relative z-10">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">{isRTL ? 'توفير التكاليف' : 'Cost Savings'}</span>
                            <span className="text-3xl font-extrabold text-black dark:text-white tracking-tight">$42,890</span>
                          </div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20 px-2.5 py-1 rounded text-xs">
                            +42.8%
                          </span>
                        </div>
                        
                        <div className="w-full h-32 relative z-10">
                          <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible drop-shadow-2xl">
                            <defs>
                              <linearGradient id="costGlowPremium" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#C41E3A" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#C41E3A" stopOpacity="0.0" />
                              </linearGradient>
                              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>
                            <motion.path 
                              initial={{ pathLength: 0, opacity: 0 }} 
                              animate={{ pathLength: 1, opacity: 1 }} 
                              transition={{ duration: 1.5, ease: 'easeOut' }}
                              d="M 0 130 Q 80 110 160 115 T 280 60 T 400 10 L 400 150 L 0 150 Z" 
                              fill="url(#costGlowPremium)" 
                            />
                            <motion.path 
                              initial={{ pathLength: 0 }} 
                              animate={{ pathLength: 1 }} 
                              transition={{ duration: 1.5, ease: 'easeOut' }}
                              d="M 0 130 Q 80 110 160 115 T 280 60 T 400 10" 
                              fill="none" 
                              stroke="#C41E3A" 
                              strokeWidth="4" 
                              strokeLinecap="round" 
                              filter="url(#glow)"
                            />
                            <motion.g
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1.2, duration: 0.4 }}
                            >
                              <circle cx="280" cy="60" r="6" fill="#C41E3A" />
                              <circle cx="280" cy="60" r="14" fill="none" stroke="#C41E3A" strokeWidth="2" className="animate-ping opacity-75" />
                              <circle cx="280" cy="60" r="24" fill="none" stroke="#C41E3A" strokeWidth="1" className="animate-ping opacity-30 [animation-delay:0.2s]" />
                            </motion.g>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN TAB */}
              {activeTab === 'admin' && (
                <div className="flex w-full h-[500px] overflow-hidden flex-col p-6 justify-between bg-zinc-50 dark:bg-[#0A0A0A]">
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Shield className="size-5 text-blue-600 dark:text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-black dark:text-white">{isRTL ? 'لوحة تحكم المؤسسات' : 'Enterprise Control Center'}</h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{isRTL ? 'إدارة الموارد، الصلاحيات والتكاليف' : 'Manage resources, permissions, and costs'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tracking-widest flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      SYS: OPERATIONAL
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-5 my-4">
                    {[
                      { label: isRTL ? 'المستخدمون النشطون' : 'Active Users', val: '1,284', grow: '+18.5%', icon: Users, color: 'text-blue-500 dark:text-blue-400' },
                      { label: isRTL ? 'استهلاك الرموز' : 'Token Usage', val: '8.6M', grow: '+4.2%', icon: Cpu, color: 'text-purple-500 dark:text-purple-400' },
                      { label: isRTL ? 'متوسط الاستجابة' : 'Avg Latency', val: '190ms', grow: 'Optimal', icon: Zap, color: 'text-emerald-500 dark:text-emerald-400' },
                    ].map((s, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={s.label} 
                        className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden group shadow-sm"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                          <s.icon className={`size-12 ${s.color}`} />
                        </div>
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 relative z-10">{s.label}</span>
                        <span className="block text-3xl font-extrabold text-black dark:text-white tracking-tight relative z-10">{s.val}</span>
                        <span className="inline-flex mt-3 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 relative z-10">{s.grow}</span>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="flex-1 border border-black/5 dark:border-white/5 rounded-2xl p-4 bg-white dark:bg-[#121212] flex flex-col relative overflow-hidden shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 px-2">Model Fleet Status</div>
                    <div className="space-y-3 px-2">
                      {[
                        { name: '🤖 Gemini 1.5 Pro', type: 'Multimodal', ms: '170ms', load: 45 },
                        { name: '🧠 GPT-4o API', type: 'Reasoning', ms: '450ms', load: 82 },
                        { name: '🚀 Claude 3.5 Sonnet', type: 'Agentic', ms: '310ms', load: 60 },
                      ].map((m) => (
                        <div key={m.name} className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{m.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{m.type}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:flex flex-col items-end gap-1">
                              <span className="text-[9px] font-mono text-zinc-500">LOAD {m.load}%</span>
                              <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${m.load > 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${m.load}%` }} />
                              </div>
                            </div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-1 rounded-md flex items-center gap-1.5 min-w-[90px] justify-center">
                              <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                              {m.ms}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


const brandLogos = [
  { name: 'OpenAI', icon: Brain },
  { name: 'Anthropic', icon: AnthropicIcon },
  { name: 'Google', icon: Bot },
  { name: 'Meta', icon: MessageSquare },
  { name: 'Mistral', icon: Zap },
  { name: 'Perplexity', icon: Search }
];

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

function SectionHeader({
  eyebrow,
  title,
  body,
  inverted = false,
}: {
  eyebrow: TranslationKeys;
  title: TranslationKeys;
  body: TranslationKeys;
  inverted?: boolean;
}) {
  const localize = useLocalize();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="mx-auto max-w-3xl text-center"
    >
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#C41E3A]/20 bg-[#C41E3A]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C41E3A]">
        <span className="size-1.5 rounded-full bg-[#C41E3A] animate-pulse" />
        {localize(eyebrow)}
      </p>
      <h2
        className={`text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl ${inverted ? 'text-white' : 'text-zinc-950 dark:text-white'
          }`}
      >
        {localize(title)}
      </h2>
      <p
        className={`mx-auto mt-5 max-w-2xl text-base leading-7 ${inverted ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
      >
        {localize(body)}
      </p>
    </motion.div>
  );
}

/* ── Tech Marquee ── */
function TechMarquee() {
  return (
    <div className="relative overflow-hidden py-6">
      <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white dark:from-zinc-950" />
      <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white dark:from-zinc-950" />
      <div className="nashm-marquee-track">
        {[...techProviders, ...techProviders].map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="mx-6 flex-none text-sm font-semibold text-zinc-400 dark:text-zinc-600 transition-colors hover:text-[#C41E3A] dark:hover:text-[#C41E3A] select-none whitespace-nowrap"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

const glowGradients: Record<Accent, string> = {
  red: 'from-[#C41E3A]/10 to-transparent',
  blue: 'from-blue-500/10 to-transparent',
  green: 'from-emerald-500/10 to-transparent',
  amber: 'from-amber-500/10 to-transparent',
  purple: 'from-fuchsia-500/10 to-transparent',
  slate: 'from-zinc-500/10 to-transparent',
};

const hoverBorderClassNames: Record<Accent, string> = {
  red: 'hover:border-[#C41E3A]/40 dark:hover:border-[#C41E3A]/50',
  blue: 'hover:border-blue-500/40 dark:hover:border-blue-500/50',
  green: 'hover:border-emerald-500/40 dark:hover:border-emerald-500/50',
  amber: 'hover:border-amber-500/40 dark:hover:border-amber-500/50',
  purple: 'hover:border-fuchsia-500/40 dark:hover:border-fuchsia-500/50',
  slate: 'hover:border-zinc-500/40 dark:hover:border-zinc-500/50',
};

const hoverTextClassNames: Record<Accent, string> = {
  red: 'group-hover:text-[#C41E3A]',
  blue: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  green: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  amber: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
  purple: 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400',
  slate: 'group-hover:text-zinc-650 dark:group-hover:text-zinc-200',
};

function renderFeatureVisual(title: string) {
  if (title === 'com_landing_trust_secure_title') {
    return (
      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-stone-800/40 flex flex-wrap gap-2">
        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm">
          2FA Active
        </span>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#C41E3A]/10 text-[#C41E3A] border border-[#C41E3A]/20 shadow-sm">
          SAML SSO
        </span>
        <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
          AES-256
        </span>
      </div>
    );
  }

  if (title === 'com_landing_trust_workflows_title') {
    return (
      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-stone-800/40 flex items-center justify-between text-[10px] font-bold text-stone-500 dark:text-stone-400">
        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/40 px-2.5 py-1 rounded-lg border border-stone-200/50 dark:border-stone-700/30 shadow-sm">
          <FileText className="size-3 text-blue-500" />
          <span>FILE</span>
        </div>
        <div className="h-[2px] flex-1 mx-2 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-60 animate-pulse" />
        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/40 px-2.5 py-1 rounded-lg border border-stone-200/50 dark:border-stone-700/30 shadow-sm">
          <Cpu className="size-3 text-emerald-500" />
          <span>AGENT</span>
        </div>
        <div className="h-[2px] flex-1 mx-2 bg-gradient-to-r from-emerald-500 to-purple-500 opacity-60" />
        <div className="flex items-center gap-1.5 bg-[#C41E3A]/10 px-2.5 py-1 rounded-lg border border-[#C41E3A]/20 text-[#C41E3A] shadow-sm">
          <Sparkles className="size-3" />
          <span>DONE</span>
        </div>
      </div>
    );
  }

  if (title === 'com_landing_trust_billing_title') {
    return (
      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-stone-800/40 flex flex-col gap-2.5">
        <div className="flex justify-between text-[10px] font-bold text-stone-500 dark:text-stone-400">
          <span>TOKEN USAGE</span>
          <span>8.2k / 10k reqs</span>
        </div>
        <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800/60 rounded-full overflow-hidden">
          <div className="h-full w-[82%] bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-stone-500 dark:text-stone-400">
          <span>CREDIT BALANCE</span>
          <span className="text-emerald-500">$45.50 remaining</span>
        </div>
      </div>
    );
  }

  return null;
}

function FeatureCard({ feature }: { feature: LandingFeature }) {
  const localize = useLocalize();
  const Icon = feature.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/60 dark:bg-stone-900/30 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 ${hoverBorderClassNames[feature.accent]} hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 h-full flex flex-col justify-between`}
    >
      {/* Glow shadow blur behind card on hover */}
      <div className={`absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${glowGradients[feature.accent]} blur-md -z-10 rounded-2xl pointer-events-none`} />
      
      {/* Inner glass light shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
      
      <div className="flex flex-col h-full justify-between">
        <div>
          <div
            className={`mb-5 inline-flex size-11 items-center justify-center rounded-xl border ${accentClassNames[feature.accent]} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md`}
          >
            <Icon className="size-5" />
          </div>
          <h3 className={`text-lg font-bold text-zinc-950 dark:text-white transition-colors duration-300 ${hoverTextClassNames[feature.accent]} text-start`}>
            {localize(feature.title)}
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-650 dark:text-zinc-300 text-start">
            {localize(feature.body)}
          </p>
        </div>
        {renderFeatureVisual(feature.title)}
      </div>
    </motion.article>
  );
}

function PlanCard({ plan }: { plan: LandingPlan }) {
  const localize = useLocalize();
  const Icon = plan.icon;

  return (
    <article
      className={`group flex h-full flex-col rounded-xl border bg-white/60 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-950/50 ${plan.featured
          ? 'border-[#C41E3A] shadow-md shadow-[#C41E3A]/10 ring-1 ring-[#C41E3A]/20'
          : 'border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-lg border border-[#C41E3A]/25 bg-[#C41E3A]/10 text-[#C41E3A] transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-5" />
          </span>
          <div className="text-start">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">{plan.title.startsWith('com_') ? localize(plan.title as any) : plan.title}</h3>
            {plan.priceText && (
              <p className="text-2xl font-black text-zinc-950 dark:text-white mt-1 mb-1">{plan.priceText}</p>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C41E3A]">{plan.badge.startsWith('com_') ? localize(plan.badge as any) : plan.badge}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 min-h-16 text-sm leading-6 text-zinc-650 dark:text-zinc-300 text-start">
        {plan.body.startsWith('com_') ? localize(plan.body as any) : plan.body}
      </p>
      <ul className="mt-5 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-250 text-start">
            <span className="mt-2.5 size-1.5 flex-none rounded-full bg-[#C41E3A]" />
            <span>{feature.startsWith('com_') ? localize(feature as any) : feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <button
          className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${plan.featured
              ? 'bg-[#C41E3A] text-white hover:bg-[#a91831] shadow-lg shadow-[#C41E3A]/20'
              : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-850'
            }`}
        >
          {localize('com_landing_cta_start')}
        </button>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════
   REDSUN-STYLE FEATURES SECTION
   ═══════════════════════════════════════════════ */
function RedsunFeaturesSection() {
  const localize = useLocalize();
  const isRTL = document.documentElement.dir === 'rtl';

  const featListItems = [
    {
      icon: MessageSquare,
      bg: 'bg-[#C41E3A]',
      title: isRTL ? 'محادثات ذكية' : 'AI Sessions',
      desc: isRTL ? 'دردشة مع نماذج GPT، Gemini، Claude وأكثر من 12 نموذجاً من منصة واحدة' : 'Chat with GPT, Gemini, Claude & 12+ models from one unified workspace',
    },
    {
      icon: Code2,
      bg: 'bg-blue-500',
      title: isRTL ? 'معاينة الكود المباشرة' : 'Live Code Preview',
      desc: isRTL ? 'أنشئ مكونات كاملة واعرضها مباشرة دون مغادرة نشم' : 'Generate full components and preview them live without leaving Nashm',
    },
    {
      icon: Database,
      bg: 'bg-fuchsia-500',
      title: isRTL ? 'ذاكرة طويلة الأمد' : 'Long-term Memory',
      desc: isRTL ? 'يتذكر نشم تفضيلاتك وأسلوبك عبر جميع محادثاتك' : 'Nashm remembers your preferences and style across all conversations',
    },
    {
      icon: Globe,
      bg: 'bg-emerald-500',
      title: isRTL ? 'دعم عربي كامل' : 'Full Arabic Support',
      desc: isRTL ? 'واجهة كاملة من اليمين لليسار مع دعم اللغة العربية بشكل أصيل' : 'Full RTL interface with native Arabic language support built-in',
    },
  ];

  return (
    <section className="nashm-features-section relative px-4 py-32 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-transparent via-zinc-50/50 to-transparent dark:via-zinc-900/20">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 -left-64 w-96 h-96 bg-[#C41E3A]/10 rounded-full blur-3xl opacity-50 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="text-center mb-20"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/[0.05] dark:border-white/[0.05] bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#C41E3A] shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C41E3A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C41E3A]"></span>
            </span>
            {localize('com_landing_features_eyebrow')}
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white mb-6">
            {isRTL ? (
              <>أطلق العنان لـ <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C41E3A] to-red-400">الإمكانيات</span></>
            ) : (
              <>Unleash your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C41E3A] to-red-400">Potential</span></>
            )}
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {localize('com_landing_features_body')}
          </p>
        </motion.div>

        {/* Two-column layout: text left + feature list right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: big heading + description */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-white mb-6 leading-[1.15]">
              {isRTL
                ? 'الإدارة الشاملة لمساعدتك على رؤية الصورة الأكبر'
                : 'Top management, to help you see the bigger picture'}
            </h3>
            <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 mb-10">
              {isRTL
                ? 'نشم يمنحك إمكانية الوصول لأقوى نماذج الذكاء الاصطناعي في العالم مع إدارة متكاملة للمستخدمين والفرق والتكاليف بلمسة احترافية.'
                : 'Nashm gives you access to the world\'s most powerful AI models with comprehensive user, team, and cost management in a premium interface.'}
            </p>

            {/* Big stats row */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              {[
                { val: '12+', label: isRTL ? 'نموذج AI' : 'AI Models', icon: Brain, color: 'text-blue-500' },
                { val: '99.9%', label: isRTL ? 'وقت التشغيل' : 'Uptime', icon: Zap, color: 'text-emerald-500' },
                { val: '∞', label: isRTL ? 'محادثات' : 'Chats', icon: MessageSquare, color: 'text-purple-500' },
              ].map((s, idx) => (
                <motion.div 
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 + 0.3 }}
                  className="relative group p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className={`absolute -inset-0.5 bg-gradient-to-br from-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />
                  <s.icon className={`w-5 h-5 mb-3 ${s.color} opacity-80`} />
                  <div className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">{s.val}</div>
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">{s.label}</div>
                </motion.div>
              ))}
            </div>

            <Link
              to="/register"
              className="group inline-flex h-12 items-center gap-3 rounded-xl bg-zinc-950 dark:bg-white px-8 text-sm font-bold text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/20 dark:shadow-white/10 transition-all hover:scale-[1.02] hover:shadow-2xl hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              {isRTL ? 'ابدأ رحلتك مجاناً' : 'Start your journey free'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Right: stacked feature list cards */}
          <motion.div
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.1 }}
            className="grid gap-4"
          >
            {featListItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.1 }}
                  className="group relative flex items-start gap-5 rounded-2xl bg-white dark:bg-zinc-900/50 p-6 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${item.bg}`} />
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-inner flex-shrink-0 ${item.bg}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-start pt-1">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1 group-hover:text-[#C41E3A] transition-colors">{item.title}</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Bottom big grid cards — High-end Mockups */}
        <div className="mt-32 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Chat Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="group relative flex flex-col rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#C41E3A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="p-8 pb-0 relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#C41E3A] to-red-600 text-white shadow-lg shadow-[#C41E3A]/25 mb-6">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white text-start mb-3">
                {isRTL ? 'توجيه النماذج الذكي' : 'Smart Model Routing'}
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-400 text-start">
                {isRTL
                  ? 'يقوم نشم تلقائياً بتوجيه استفساراتك للنموذج الأنسب لتحقيق أقصى درجات الدقة والسرعة.'
                  : 'Nashm automatically routes your prompts to the optimal model for maximum accuracy and speed.'}
              </p>
            </div>
            
            {/* Premium Chat Mockup */}
            <div className="mt-8 mx-6 mb-6 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 shadow-inner relative z-10">
              {/* Window Chrome */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50">
                  <Sparkles className="w-3 h-3 text-[#C41E3A]" />
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Auto-Route</span>
                </div>
              </div>
              
              {/* Chat Area */}
              <div className="p-5 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-100 dark:to-white text-white dark:text-zinc-900 text-xs px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] text-start shadow-md">
                    {isRTL ? 'قم بتحليل هذه البيانات الكبيرة واستخرج أهم النقاط في تقرير مفصل.' : 'Analyze this large dataset and extract the key insights into a detailed report.'}
                  </div>
                </div>
                
                <div className="flex items-center justify-center py-2">
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Routing to Gemini 1.5 Pro
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-none mt-1 shadow-lg">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] text-start shadow-sm">
                    {isRTL ? 'بالطبع! قمت بتوجيه طلبك المعقد إلى Gemini 1.5 Pro للتحليل العميق بفضل نافذة السياق الواسعة لديه...' : 'Absolutely! I routed your complex request to Gemini 1.5 Pro for deep analysis due to its massive context window...'}
                    <div className="mt-3 flex gap-2">
                      <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                      <div className="h-1.5 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse delay-75" />
                      <div className="h-1.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Create / Artifacts */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            className="group relative flex flex-col rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="p-8 pb-0 relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 mb-6">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white text-start mb-3">
                {isRTL ? 'بيئة تفاعلية للمحتوى والكود' : 'Interactive Canvas & Code'}
              </h3>
              <p className="text-base text-zinc-600 dark:text-zinc-400 text-start">
                {isRTL
                  ? 'اكتب، صمم، وبرمج. شاهد واجهات المستخدم تتشكل أمامك وتفاعل معها مباشرة.'
                  : 'Write, design, and code. Watch beautiful UIs generate in real-time and interact with them instantly.'}
              </p>
            </div>
            
            {/* Premium Code Mockup */}
            <div className="mt-8 mx-6 mb-6 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/80 bg-[#0D0D0D] shadow-inner relative z-10">
              {/* Window Chrome */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#161616] border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md">app.tsx</span>
                    <span className="text-[10px] text-zinc-500">styles.css</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live Preview</span>
                </div>
              </div>
              
              {/* Code Area */}
              <div className="flex">
                {/* Line numbers */}
                <div className="py-4 px-3 text-[10px] font-mono text-zinc-600 text-right select-none bg-black/20 border-r border-white/5">
                  1<br/>2<br/>3<br/>4<br/>5<br/>6
                </div>
                {/* Code content */}
                <div className="p-4 font-mono text-[11px] leading-loose text-zinc-300 w-full overflow-hidden whitespace-pre">
                  <div><span className="text-purple-400">import</span> &#123; <span className="text-amber-200">motion</span> &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">'framer-motion'</span>;</div>
                  <div><span className="text-purple-400">import</span> &#123; <span className="text-amber-200">Button</span> &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">'@ui/components'</span>;</div>
                  <br/>
                  <div><span className="text-purple-400">export default function</span> <span className="text-blue-400">Hero</span>() &#123;</div>
                  <div>  <span className="text-purple-400">return</span> (</div>
                  <div>    &lt;<span className="text-red-400">motion.div</span> <span className="text-emerald-200">animate</span>=&#123;&#123; <span className="text-blue-300">opacity</span>: <span className="text-amber-400">1</span> &#125;&#125;&gt;</div>
                  <div>      &lt;<span className="text-red-400">Button</span> <span className="text-emerald-200">variant</span>=<span className="text-emerald-300">"primary"</span>&gt;Get Started&lt;/<span className="text-red-400">Button</span>&gt;</div>
                </div>
              </div>
              {/* Fake Preview Pane Overlay */}
              <div className="absolute right-0 top-[45px] bottom-0 w-2/5 border-l border-white/10 bg-zinc-900/90 backdrop-blur-md p-4 flex flex-col items-center justify-center shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
                <div className="w-full h-8 rounded-lg bg-[#C41E3A] shadow-lg shadow-[#C41E3A]/30 flex items-center justify-center text-white text-[10px] font-bold tracking-wider hover:bg-red-600 cursor-pointer transition-colors">
                  Get Started
                </div>
                <div className="mt-4 w-16 h-1 rounded-full bg-zinc-700" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE EXPORT
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const localize = useLocalize();
  const shouldReduceMotion = useReducedMotion() === true;
  const { startupConfig } = useOutletContext<TLoginLayoutContext>();
  const appTitle = startupConfig?.appTitle ?? 'Nashm';
  const registrationEnabled = startupConfig?.registrationEnabled !== false;
  const primaryPath = registrationEnabled ? '/register' : '/login';
  const primaryLabel = registrationEnabled
    ? localize('com_landing_cta_start')
    : localize('com_landing_cta_login');

  const isRTL = document.documentElement.dir === 'rtl';

  const { data: publicPlansData } = useGetPublicPlansQuery();

  // Map backend plans to UI format
  const backendPlans = publicPlansData?.plans || [];
  const dynamicPlans: LandingPlan[] = backendPlans.length > 0
    ? backendPlans.map((bp: any) => {
        const basePlan = plans.find((p) => p.title.includes(bp.plan)) || plans.find((p) => p.icon === Bot) || plans[1];
        return {
          icon: basePlan.icon,
          title: bp.displayName || bp.plan,
          badge: basePlan.badge,
          body: bp.description || basePlan.body,
          features: bp.features && bp.features.length > 0 ? bp.features : basePlan.features,
          featured: bp.plan === 'individual',
          priceText: bp.priceText,
        };
      })
    : plans;

  useEffect(() => {
    document.title = localize('com_landing_document_title', { appTitle });
  }, [appTitle, localize]);

  const navScrolled = useScrolled();

  return (
    <div className="min-h-screen bg-presentation text-text-primary">
      {/* ── NAVBAR ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${navScrolled
            ? 'nashm-nav-scrolled bg-presentation backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.06]'
            : 'bg-transparent border-b border-transparent'
          }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" aria-label={localize('com_landing_home_aria')}>
            <img
              src="/assets/logo.png"
              alt={localize('com_ui_logo', { 0: appTitle })}
              className="size-9 object-contain nashm-logo-glow"
            />
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">{appTitle}</span>
          </Link>

          {/* Nav links */}
          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400 md:flex">
            <a href="#features" className="transition-colors duration-200 hover:text-zinc-950 dark:hover:text-white">
              {localize('com_landing_nav_features')}
            </a>
            <a href="#plans" className="transition-colors duration-200 hover:text-zinc-950 dark:hover:text-white">
              {localize('com_landing_nav_plans')}
            </a>
            <a href="#security" className="transition-colors duration-200 hover:text-zinc-950 dark:hover:text-white">
              {localize('com_landing_nav_security')}
            </a>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white sm:inline-flex border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              {localize('com_landing_cta_login')}
            </Link>
            <Link
              to={primaryPath}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#C41E3A] px-5 text-sm font-semibold text-white shadow-lg shadow-[#C41E3A]/20 transition-all duration-300 hover:bg-[#a91831] hover:shadow-[#C41E3A]/30"
            >
              {primaryLabel}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ═══════════════════════════════════════
            HERO SECTION — RedSun Two-Column Layout
            ═══════════════════════════════════════ */}
        <section className="nashm-hero-section pt-16">
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center lg:gap-12">
              {/* Left column: text */}
              <div className="flex flex-col items-start text-start">
                {/* "What's New" badge */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-6"
                >
                  <div className="nashm-badge-new">
                    <span className="badge-pill">{isRTL ? 'جديد' : "What's New"}</span>
                    <span>{isRTL ? 'بيئة عمل تفاعلية لتشغيل الأكواد (Artifacts) ←' : 'Interactive Code Sandbox & Artifacts →'}</span>
                  </div>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.6, ease: 'easeOut' }}
                  className="nashm-hero-title text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl xl:text-7xl"
                >
                  {isRTL
                    ? <>{appTitle} نشم<br />مساعد الذكاء الاصطناعي<br /><span style={{ WebkitTextFillColor: '#C41E3A', color: '#C41E3A' }}>لعملك ولفريقك</span></>
                    : <>{isRTL ? 'Intelligent' : 'Intelligent'} AI<br />powered by{' '}
                      <span style={{ WebkitTextFillColor: '#C41E3A', color: '#C41E3A' }}>Nashm.</span></>
                  }
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16, duration: 0.55, ease: 'easeOut' }}
                  className="mt-6 max-w-lg text-base leading-7 text-zinc-600 dark:text-zinc-300 md:text-lg"
                >
                  {localize('com_landing_hero_body')}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.55, ease: 'easeOut' }}
                  className="mt-8 flex flex-wrap gap-3"
                >
                  <Link
                    to={primaryPath}
                    className="inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-xl bg-[#C41E3A] px-6 text-sm font-bold text-white shadow-xl shadow-[#C41E3A]/25 transition-all duration-300 hover:bg-[#a91831] hover:scale-[1.02] active:scale-[0.98] nashm-glow-button"
                  >
                    {primaryLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-white/[0.04] px-6 text-sm font-bold text-zinc-900 dark:text-white backdrop-blur transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-white/[0.07] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <LogIn className="size-4" />
                    {localize('com_landing_cta_login')}
                  </Link>
                </motion.div>


              </div>

              {/* Right column: Interactive Prompt Builder */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
                className="relative"
              >
                <InteractivePromptBuilder reduceMotion={shouldReduceMotion} />
              </motion.div>
            </div>

            {/* Tech marquee below two-column */}
            <div className="mt-40 pb-20 overflow-hidden">
              <p className="text-center text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-14">
                {isRTL ? 'مدعوم من أفضل مزودي الذكاء الاصطناعي' : 'Powered by the world\'s leading AI providers'}
              </p>
              <div className="relative py-10 -rotate-[2.5deg] scale-[1.02] origin-center">
                {/* Fade overlays on sides using the theme background variable */}
                <div className="absolute inset-y-0 left-0 z-10 w-48 bg-gradient-to-r from-presentation to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 z-10 w-48 bg-gradient-to-l from-presentation to-transparent pointer-events-none" />

                <div className="relative overflow-hidden w-full">
                  <motion.div 
                    variants={marqueeVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="nashm-marquee-track-reverse"
                  >
                    {[...techProvidersPairs, ...techProvidersPairs].map((pair, i) => {
                      return (
                        <motion.div
                          key={`pair-${i}`}
                          variants={makePairVariant()}
                          className="mx-10 flex flex-col gap-8"
                        >
                          {pair.map((provider) => {
                            const Comp = provider.Component;
                            return (
                              <motion.div
                                key={provider.name}
                                style={{ rotate: 2.5 }}
                                whileHover={{ scale: 1.08, y: -4 }}
                                className="flex items-center gap-5 px-10 py-5 rounded-[1.25rem] bg-white/40 dark:bg-stone-900/30 border border-zinc-200/50 dark:border-stone-800/40 shadow-sm backdrop-blur-sm cursor-pointer select-none whitespace-nowrap min-w-[240px] justify-center"
                              >
                                {provider.isComponent && Comp ? (
                                  <Comp className={`size-7 ${provider.color || 'text-stone-600 dark:text-stone-300'}`} />
                                ) : (
                                  <img
                                    src={provider.logo}
                                    alt={provider.name}
                                    className="h-7 w-auto object-contain opacity-95 dark:opacity-90 transition-all duration-300"
                                  />
                                )}
                                <span className="text-base font-bold text-stone-600 dark:text-stone-300">{provider.name}</span>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gradient divider */}
        <div className="nashm-gradient-divider" />

        {/* ── Trust section ── */}
        <section className="bg-presentation py-10 relative z-20">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8"
          >
            {trustItems.map((item) => (
              <motion.div key={item.title} variants={staggerItem}>
                <FeatureCard feature={item} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <div className="nashm-gradient-divider" />

        {/* ═══════════════════════════════════════
            FEATURES SECTION — RedSun Style
            ═══════════════════════════════════════ */}
        <div id="features">
          <RedsunFeaturesSection />
        </div>

        <div className="nashm-gradient-divider" />

        {/* ── Showcase Dashboard (from hero) ── */}
        <section className="bg-presentation px-4 pb-24 sm:px-6 lg:px-8 relative z-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="com_landing_features_eyebrow"
              title="com_landing_features_title"
              body="com_landing_features_body"
            />
            <ShowcaseDashboard reduceMotion={shouldReduceMotion} />
          </div>
        </section>

        {/* ── Differentiators section ── */}
        <section className="relative bg-presentation px-4 py-24 sm:px-6 lg:px-8 overflow-hidden">
          <div className="relative z-10">
            <SectionHeader
              eyebrow="com_landing_difference_eyebrow"
              title="com_landing_difference_title"
              body="com_landing_difference_body"
              inverted={false}
            />
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className="mx-auto mt-14 grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
            >
              {differentiators.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    variants={staggerItem}
                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white/60 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#C41E3A]/40 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950/40 h-full flex flex-col justify-between"
                  >
                    <div>
                      <div className={`mb-5 inline-flex size-11 items-center justify-center rounded-lg border ${accentClassNames[feature.accent]} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="size-5" />
                      </div>
                      <h3 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white text-start">{localize(feature.title)}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-650 dark:text-zinc-300 text-start">{localize(feature.body)}</p>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <div className="nashm-gradient-divider" />

        {/* ── Plans section ── */}
        <section id="plans" className="px-4 py-24 sm:px-6 lg:px-8 bg-presentation">
          <SectionHeader
            eyebrow="com_landing_plans_eyebrow"
            title="com_landing_plans_title"
            body="com_landing_plans_body"
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="mx-auto mt-14 grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            {dynamicPlans.map((plan: LandingPlan) => (
              <motion.div key={plan.title} variants={staggerItem}>
                <PlanCard plan={plan} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <div className="nashm-gradient-divider" />

        {/* ── Security / Admin section ── */}
        <section
          id="security"
          className="bg-presentation px-4 py-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#C41E3A]/20 bg-[#C41E3A]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C41E3A]">
                <span className="size-1.5 rounded-full bg-[#C41E3A] animate-pulse" />
                {localize('com_landing_admin_eyebrow')}
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white md:text-4xl">
                {localize('com_landing_admin_title')}
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-500 dark:text-zinc-400">
                {localize('com_landing_admin_body')}
              </p>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {adminHighlights.map((item) => (
                  <motion.div key={item.title} variants={staggerItem}>
                    <FeatureCard feature={item} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
              className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-2xl dark:border-zinc-800/80 dark:bg-zinc-950"
            >
              <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800/60">
                <div>
                  <p className="text-sm font-bold text-zinc-950 dark:text-white">{localize('com_landing_admin_mock_title')}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{localize('com_landing_admin_mock_body')}</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {localize('com_landing_admin_mock_status')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {adminStats.map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/60 dark:bg-zinc-900/60">
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{localize(label)}</span>
                    <span className="mt-1 block text-xl font-bold text-zinc-950 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {adminModels.map((model, index) => (
                  <div key={model} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-2.5 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">{localize(model)}</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {index === 2 ? localize('com_landing_admin_mock_ready') : localize('com_landing_admin_mock_active')}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <div className="nashm-gradient-divider" />

        {/* ── Final CTA ── */}
        <section className="relative px-4 py-28 sm:px-6 lg:px-8 overflow-hidden bg-presentation">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="nashm-cta-glow mx-auto max-w-3xl text-center relative z-10"
          >
            <img
              src="/assets/logo.png"
              alt={localize('com_ui_logo', { 0: appTitle })}
              className="mx-auto mb-8 size-20 object-contain nashm-logo-glow"
            />
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white md:text-4xl lg:text-5xl">
              {localize('com_landing_final_title')}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
              {localize('com_landing_final_body')}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={primaryPath}
                className="inline-flex h-12 min-w-48 items-center justify-center gap-2 rounded-lg bg-[#C41E3A] px-6 text-sm font-bold text-white shadow-xl shadow-[#C41E3A]/20 transition-all duration-300 hover:bg-[#a91831] hover:shadow-[#C41E3A]/30 hover:scale-[1.02] active:scale-[0.98] nashm-glow-button"
              >
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 min-w-48 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white/60 px-6 text-sm font-bold text-zinc-700 backdrop-blur transition-all duration-300 hover:border-zinc-300 hover:scale-[1.02] active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-700"
              >
                <LogIn className="size-4" />
                {localize('com_landing_cta_login')}
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Footer divider */}
        <div className="nashm-gradient-divider" />
        <footer className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-600 bg-presentation">
          <p>&copy; {new Date().getFullYear()} {appTitle}. All rights reserved.</p>
        </footer>
      </main>

      <div className="fixed bottom-4 left-4 z-50">
        <ThemeSelector />
      </div>
    </div>
  );
}
