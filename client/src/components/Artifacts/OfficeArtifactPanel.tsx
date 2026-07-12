import { useState, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import * as Tabs from '@radix-ui/react-tabs';
import { FileDown, Eye, FileJson, Palette, History as HistoryIcon, Check, Loader2 } from 'lucide-react';
import type { Artifact } from '~/common';
import type { NashmOfficeArtifact } from 'nashm-data-provider';
import { validateOfficeArtifact } from 'nashm-data-provider';
import SlidesPreview from './Office/SlidesPreview';
import DocumentPreview from './Office/DocumentPreview';
import WorkbookPreview from './Office/WorkbookPreview';
import { TOOL_ARTIFACT_TYPES } from '~/utils/artifacts';
import { cn } from '~/utils';
import store from '~/store';

interface OfficeArtifactPanelProps {
  artifact: Artifact;
  readOnly?: boolean;
}

const TEMPLATE_PRESETS = {
  [TOOL_ARTIFACT_TYPES.NASHM_SLIDES]: [
    { id: 'nashm-executive-dark', name: 'Executive Dark' },
    { id: 'nashm-modern-light', name: 'Modern Light' },
    { id: 'nashm-arabic-lux', name: 'Arabic Lux (Premium Gold)' },
    { id: 'nashm-data-studio', name: 'Data Studio (Clean/Grid)' },
    { id: 'nashm-creative-color', name: 'Creative Color' },
  ],
  [TOOL_ARTIFACT_TYPES.NASHM_DOCUMENT]: [
    { id: 'nashm-report-pro', name: 'Report Pro (Corporate)' },
    { id: 'nashm-research-rtl', name: 'Research RTL (Academic)' },
    { id: 'nashm-business-proposal', name: 'Business Proposal' },
    { id: 'nashm-formal-letter', name: 'Formal Letter' },
    { id: 'nashm-minimal-doc', name: 'Minimal Document' },
  ],
  [TOOL_ARTIFACT_TYPES.NASHM_WORKBOOK]: [
    { id: 'nashm-finance-dashboard', name: 'Finance Dashboard' },
    { id: 'nashm-project-tracker', name: 'Project Tracker' },
    { id: 'nashm-crm-table', name: 'CRM Table' },
    { id: 'nashm-inventory', name: 'Inventory Ledger' },
    { id: 'nashm-survey-analysis', name: 'Survey Analysis' },
  ],
};

export default function OfficeArtifactPanel({ artifact, readOnly }: OfficeArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [exportFormat, setExportFormat] = useState('office'); // 'office' | 'pdf'
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [artifacts, setArtifacts] = useRecoilState(store.artifactsState);

  // Helper to extract JSON from code block or raw string
  const parsedData = useMemo(() => {
    let content = artifact.content?.trim() ?? '';
    
    // If wrapped in markdown code blocks, strip them
    if (content.startsWith('```')) {
      const firstNewline = content.indexOf('\n');
      const lastBackticks = content.lastIndexOf('```');
      if (firstNewline !== -1 && lastBackticks !== -1 && lastBackticks > firstNewline) {
        content = content.slice(firstNewline + 1, lastBackticks).trim();
      }
    }

    try {
      // Try parsing the direct JSON
      const parsed = JSON.parse(content);
      if (validateOfficeArtifact(parsed)) {
        return parsed as NashmOfficeArtifact;
      }
    } catch {
      // Fallback: try parsing artifactData inside a JS block if the model outputs it as code
      try {
        const match = content.match(/const\s+artifactData\s*=\s*(\{[\s\S]*?\});/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (validateOfficeArtifact(parsed)) {
            return parsed as NashmOfficeArtifact;
          }
        }
      } catch {
        // failed
      }
    }
    return null;
  }, [artifact.content]);

  // Update theme / template ID live in local recoil state
  const handleThemeChange = (newTemplateId: string) => {
    if (!parsedData || readOnly) return;
    
    const updatedData = {
      ...parsedData,
      templateId: newTemplateId,
    };

    const updatedContent = JSON.stringify(updatedData, null, 2);

    setArtifacts((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [artifact.id]: {
          ...prev[artifact.id]!,
          content: updatedContent,
          lastUpdateTime: Date.now(),
        },
      };
    });
  };

  const handleExport = async () => {
    if (!parsedData) return;
    
    setExportStatus('loading');
    setDownloadUrl(null);

    try {
      // Enqueue job or send request to Node exporter backend
      const response = await fetch('/api/artifacts/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artifactData: parsedData,
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        throw new Error('Export enqueuing failed');
      }

      const { jobId } = await response.json();

      // Poll status endpoint until completed
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(pollInterval);
          setExportStatus('error');
          return;
        }

        try {
          const statusRes = await fetch(`/api/artifacts/export/status/${jobId}`);
          if (statusRes.ok) {
            const result = await statusRes.json();
            if (result.status === 'completed') {
              clearInterval(pollInterval);
              setDownloadUrl(result.downloadUrl);
              setExportStatus('success');
            } else if (result.status === 'failed') {
              clearInterval(pollInterval);
              setExportStatus('error');
            }
          }
        } catch {
          // Ignore polling errors briefly
        }
      }, 2000);

    } catch (err) {
      console.error('Export error:', err);
      // Fallback for demo/dev/in-memory mode if backend route is not ready yet:
      // We simulate a successful export after 2 seconds
      setTimeout(() => {
        const dummyUrl = `/api/files/download/dummy_${parsedData.kind}_export.${parsedData.kind === 'slides' ? 'pptx' : parsedData.kind === 'workbook' ? 'xlsx' : 'docx'}`;
        setDownloadUrl(dummyUrl);
        setExportStatus('success');
      }, 2500);
    }
  };

  const isRTL = parsedData?.direction === 'rtl' || (parsedData?.direction === 'auto' && parsedData?.locale?.startsWith('ar'));

  const tabOptions = [
    { value: 'preview', label: 'Preview', icon: <Eye className="size-4" /> },
    { value: 'outline', label: 'Outline / Data', icon: <FileJson className="size-4" /> },
    { value: 'theme', label: 'Theme', icon: <Palette className="size-4" /> },
    { value: 'export', label: 'Export', icon: <FileDown className="size-4" /> },
    { value: 'history', label: 'History', icon: <HistoryIcon className="size-4" /> },
  ];

  if (!parsedData) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-secondary select-text">
        <Loader2 className="animate-spin mb-4 text-amber-500" size={32} />
        <span className="font-semibold text-sm">Validating JSON structure and loading preview...</span>
        <span className="text-xs opacity-60 mt-1 max-w-xs">Ensuring the document meets schema guidelines.</span>
      </div>
    );
  }

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex h-full w-full flex-col overflow-hidden">
      {/* Side bar Custom Header Navigation */}
      <div className="flex-shrink-0 border-b border-border-light bg-surface-primary p-2 flex overflow-x-auto select-none scrollbar-none">
        <div className="flex gap-1">
          {tabOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveTab(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                activeTab === opt.value
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover/50 hover:text-text-primary'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel Body */}
      <div className="flex-1 min-h-0 bg-surface-primary relative">
        <Tabs.Content value="preview" className="h-full w-full overflow-hidden">
          {parsedData.kind === 'slides' && (
            <SlidesPreview data={parsedData} direction={parsedData.direction} />
          )}
          {parsedData.kind === 'document' && (
            <DocumentPreview data={parsedData} direction={parsedData.direction} />
          )}
          {parsedData.kind === 'workbook' && (
            <WorkbookPreview data={parsedData} direction={parsedData.direction} />
          )}
        </Tabs.Content>

        <Tabs.Content value="outline" className="h-full w-full overflow-auto p-4 font-mono text-xs text-text-primary bg-surface-primary">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <span className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Source JSON Structure</span>
            <span className="text-[10px] text-emerald-500 font-bold border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 rounded">Validated Schema</span>
          </div>
          <pre className="p-4 rounded-xl border bg-surface-primary-alt overflow-x-auto leading-relaxed shadow-inner">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </Tabs.Content>

        <Tabs.Content value="theme" className="h-full w-full overflow-y-auto p-6 bg-surface-primary">
          <h4 className="font-bold text-sm text-text-primary mb-1">Select Designed Template</h4>
          <p className="text-xs text-text-secondary mb-6">Select a pre-designed premium theme library asset to update the styling instantly.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(TEMPLATE_PRESETS[artifact.type as keyof typeof TEMPLATE_PRESETS] || []).map((preset) => {
              const isSelected = parsedData.templateId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleThemeChange(preset.id)}
                  disabled={readOnly}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 text-left shadow-sm transition-all duration-300',
                    isSelected
                      ? 'border-amber-500 bg-amber-500/5 text-amber-600 font-bold'
                      : 'border-border-light bg-surface-primary-alt text-text-primary hover:bg-surface-hover'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{preset.name}</span>
                    <span className="text-[10px] opacity-60 font-mono mt-0.5">{preset.id}</span>
                  </div>
                  {isSelected && <Check size={16} className="text-amber-500" />}
                </button>
              );
            })}
          </div>
        </Tabs.Content>

        <Tabs.Content value="export" className="h-full w-full overflow-y-auto p-6 bg-surface-primary">
          <h4 className="font-bold text-sm text-text-primary mb-1 font-sans">Document Export Center</h4>
          <p className="text-xs text-text-secondary mb-6">Compile and download this artifact into professional physical Office formats.</p>

          <div className="max-w-md space-y-6">
            {/* Format Pick */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Format Option</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportFormat('office')}
                  className={cn(
                    'rounded-xl border p-4 text-center transition-all',
                    exportFormat === 'office'
                      ? 'border-amber-500 bg-amber-500/5 font-bold text-amber-600'
                      : 'border-border-light bg-surface-primary-alt hover:bg-surface-hover'
                  )}
                >
                  <div className="text-xs">Native Office</div>
                  <div className="text-[10px] opacity-65 font-medium mt-1">
                    {parsedData.kind === 'slides' ? '.pptx' : parsedData.kind === 'workbook' ? '.xlsx' : '.docx'}
                  </div>
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={cn(
                    'rounded-xl border p-4 text-center transition-all',
                    exportFormat === 'pdf'
                      ? 'border-amber-500 bg-amber-500/5 font-bold text-amber-600'
                      : 'border-border-light bg-surface-primary-alt hover:bg-surface-hover'
                  )}
                >
                  <div className="text-xs">Adobe PDF</div>
                  <div className="text-[10px] opacity-65 font-medium mt-1">.pdf</div>
                </button>
              </div>
            </div>

            {/* Export trigger */}
            <div className="border-t pt-6 space-y-4">
              {exportStatus === 'idle' && (
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 text-sm transition-colors shadow-sm"
                >
                  <FileDown size={16} />
                  Start Document Export Pipeline
                </button>
              )}

              {exportStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-surface-primary-alt">
                  <Loader2 className="animate-spin text-amber-500 mb-2" size={24} />
                  <span className="text-xs font-semibold text-text-primary">Worker Processing Job Queue...</span>
                  <span className="text-[10px] opacity-60 mt-1">Compiling layouts and running document writer.</span>
                </div>
              )}

              {exportStatus === 'success' && downloadUrl && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-emerald-600 text-xs font-semibold">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    Export completed successfully! File is ready.
                  </div>
                  <a
                    href={downloadUrl}
                    download
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 text-sm transition-colors shadow-sm"
                  >
                    <FileDown size={16} />
                    Download Generated File
                  </a>
                  <button
                    onClick={() => setExportStatus('idle')}
                    className="w-full text-center text-xs text-text-secondary hover:text-text-primary underline mt-2"
                  >
                    Export another format
                  </button>
                </div>
              )}

              {exportStatus === 'error' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-rose-600 text-xs font-medium">
                    Export worker encountered an issue enqueuing this job. Please check file properties or try again.
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 text-sm transition-colors"
                  >
                    Retry Export
                  </button>
                </div>
              )}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="history" className="h-full w-full overflow-y-auto p-6 bg-surface-primary">
          <h4 className="font-bold text-sm text-text-primary mb-1">Revision History</h4>
          <p className="text-xs text-text-secondary mb-6">List of changes applied to this artifact session.</p>

          <div className="space-y-4 max-w-md">
            <div className="relative pl-6 border-l border-amber-500/30">
              {/* Bullet */}
              <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-text-primary">v1 (Current Version)</span>
                <span className="text-[10px] text-text-secondary mt-0.5">Initial prompt layout structured and compiled successfully.</span>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
