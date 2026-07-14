import { useState, useEffect, useRef, useMemo } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { Headphones, UploadCloud, CheckCircle2, AlertTriangle, FileDown, FileText, Loader2, Sparkles, Languages, Check } from 'lucide-react';
import { Button } from '@nashm/client';
import type { Artifact } from '~/common';
import store from '~/store';
import { useAuthContext } from '~/hooks/AuthContext';
import { cn } from '~/utils';

// Convert seconds into HH:MM:SS format
const formatDuration = (seconds: number | null) => {
  if (seconds === null) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

interface AudioTranscriptionPanelProps {
  artifact: Artifact;
  readOnly?: boolean;
}

interface Utterance {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export default function AudioTranscriptionPanel({ artifact, readOnly }: AudioTranscriptionPanelProps) {
  const { token } = useAuthContext();
  const activeConversation = useRecoilValue(store.conversationByIndex(0));
  const setArtifacts = useSetRecoilState(store.artifactsState);

  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');
  const [languageCode, setLanguageCode] = useState<string>('ar'); // Default to Arabic
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [transcriptData, setTranscriptData] = useState<Utterance[] | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore pre-existing transcription summary and utterances if present
  useEffect(() => {
    if (status === 'idle' && artifact.content && artifact.content.trim() !== '') {
      const parts = artifact.content.split('=== SPEAKER TRANSCRIPT ===');
      const summaryPart = parts[0]?.trim();
      const transcriptPart = parts[1]?.trim();
      
      if (summaryPart && transcriptPart) {
        const utterances: Utterance[] = [];
        const lines = transcriptPart.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^\[Speaker\s+([^\]]+)\]\s+\(([^)]+)\):\s*(.*)$/);
          if (match) {
            const [_, speaker, timeStr, text] = match;
            const timeParts = timeStr.split(':').map(Number);
            let start = 0;
            if (timeParts.length === 3) {
              start = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 2) {
              start = timeParts[0] * 60 + timeParts[1];
            }
            utterances.push({
              speaker,
              start,
              end: start,
              text,
            });
          }
        }
        
        if (utterances.length > 0) {
          setSummaryText(summaryPart);
          setTranscriptData(utterances);
          setStatus('completed');
        }
      }
    }
  }, [artifact.content, status]);

  // Poll status when jobId is present and the job is active
  useEffect(() => {
    if (!jobId || ['completed', 'failed'].includes(status)) {
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/audio/status/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error('Failed to fetch job status');
        }
        const data = await res.json();
        
        setStatus(data.status);
        if (data.status === 'completed') {
          setTranscriptData(data.transcriptData);
          setSummaryText(data.summaryText);
          setAudioDuration(data.audioDuration);

          // Update global artifact content so Copy & Download header buttons work!
          if (data.summaryText && data.transcriptData) {
            const formattedContent = `${data.summaryText}\n\n=== SPEAKER TRANSCRIPT ===\n\n` +
              data.transcriptData.map((u: Utterance) => `[Speaker ${u.speaker}] (${formatDuration(u.start)}): ${u.text}`).join('\n');
            
            setArtifacts((prev) => {
              if (!prev || !prev[artifact.id]) return prev;
              return {
                ...prev,
                [artifact.id]: {
                  ...prev[artifact.id]!,
                  content: formattedContent,
                  lastUpdateTime: Date.now(),
                },
              };
            });
          }
        } else if (data.status === 'failed') {
          setError(data.error || 'Audio transcription job failed.');
        }
      } catch (err: any) {
        console.error('Error polling status:', err);
      }
    };

    // Run first poll immediately
    poll();

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [jobId, status, token, setArtifacts, artifact.id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    // 1. Client-side checks
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError('Invalid file type. Allowed formats: MP3, WAV, M4A, OGG.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('File size exceeds the 200MB limit.');
      return;
    }

    setError(null);
    setStatus('uploading');

    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('file', file);
    if (languageCode) {
      formData.append('language_code', languageCode);
    }
    if (activeConversation?.endpoint) {
      formData.append('endpoint', activeConversation.endpoint);
    }
    if (activeConversation?.model) {
      formData.append('model', activeConversation.model);
    }

    // 3. POST Upload request
    try {
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('You have reached the maximum limit of 2 concurrent transcription jobs. Please wait for them to finish.');
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to start upload.');
      }

      const { jobId } = await response.json();
      setJobId(jobId);
      setStatus('transcribing');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Upload failed.');
      setStatus('idle');
    }
  };


  // Assign distinct premium color palettes based on speaker label hash
  const getSpeakerColor = (speaker: string) => {
    const colors = [
      'border-blue-500/20 bg-blue-500/5 text-blue-400',
      'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
      'border-purple-500/20 bg-purple-500/5 text-purple-400',
      'border-amber-500/20 bg-amber-500/5 text-amber-400',
      'border-pink-500/20 bg-pink-500/5 text-pink-400',
      'border-indigo-500/20 bg-indigo-500/5 text-indigo-400',
    ];
    const charCodeSum = speaker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  // Export generated transcript and summary as a Word docx artifact
  const handleExportWord = async () => {
    if (!transcriptData || !summaryText) return;

    setExportStatus('loading');

    // Compile into NashmDocument schema structure
    const docSections = [
      {
        title: 'Conversation Summary',
        paragraphs: summaryText.split('\n').filter(p => p.trim() !== ''),
      },
      {
        title: 'Speaker Transcript',
        paragraphs: transcriptData.map(u => `[Speaker ${u.speaker}] (${formatDuration(u.start)}): ${u.text}`),
      }
    ];

    const payload = {
      schemaVersion: 'office-artifact.v1',
      kind: 'document',
      title: 'Diarized Audio Transcript',
      locale: languageCode === 'ar' ? 'ar' : 'en',
      direction: languageCode === 'ar' ? 'rtl' : 'ltr',
      templateId: 'nashm-report-pro',
      content: {
        sections: docSections,
      },
    };

    try {
      const response = await fetch('/api/artifacts/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          artifactData: payload,
          format: 'office',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const { jobId: exportJobId } = await response.json();
      
      // Poll export completion
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(interval);
          setExportStatus('error');
          setTimeout(() => setExportStatus('idle'), 3000);
          return;
        }

        try {
          const statusRes = await fetch(`/api/artifacts/export/status/${exportJobId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (statusRes.ok) {
            const data = await statusRes.json();
            if (data.status === 'completed') {
              clearInterval(interval);
              setExportStatus('success');
              setTimeout(() => setExportStatus('idle'), 3000);
              
              // Trigger browser file download
              if (data.downloadUrl) {
                const downloadRes = await fetch(data.downloadUrl, {
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                const blob = await downloadRes.blob();
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = `Audio_Transcript_Summary.docx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            } else if (data.status === 'failed') {
              clearInterval(interval);
              setExportStatus('error');
              setTimeout(() => setExportStatus('idle'), 3000);
            }
          }
        } catch {
          // Keep trying
        }
      }, 2000);

    } catch (err) {
      console.error('Word export failed:', err);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-primary text-text-primary">
      {/* 1. Header Area */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-light bg-surface-primary-alt px-4">
        <div className="flex items-center gap-2">
          <Headphones className="size-5 text-amber-500" />
          <span className="text-sm font-semibold">Audio Diarization & Transcription</span>
        </div>
        {status === 'completed' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportWord}
            disabled={exportStatus === 'loading'}
            className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold"
          >
            {exportStatus === 'loading' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : exportStatus === 'success' ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : exportStatus === 'error' ? (
              <AlertTriangle className="size-3.5 text-red-500" />
            ) : (
              <FileDown className="size-3.5" />
            )}
            {exportStatus === 'loading'
              ? 'Exporting...'
              : exportStatus === 'success'
              ? 'Exported'
              : exportStatus === 'error'
              ? 'Failed'
              : 'Word Export'}
          </Button>
        )}
      </div>

      {/* 2. Content Body */}
      <div className="flex-grow overflow-y-auto p-4 select-text">
        {status === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={cn(
                "flex w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-medium bg-surface-primary-alt p-10 text-center shadow-inner transition-all hover:border-amber-500/40 hover:bg-surface-hover/20",
                isDragging && "border-amber-500 bg-amber-500/5 scale-98"
              )}
            >
              <UploadCloud className={cn("size-12 text-text-secondary mb-4 transition-transform", isDragging && "scale-110 text-amber-500")} />
              <p className="text-sm font-bold">Drag & drop your recording file here</p>
              <p className="text-xs text-text-secondary mt-1">or click to browse local files (MP3, WAV, M4A, OGG, max 200MB)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*"
                className="hidden"
              />
            </div>

            {/* Language Selection */}
            <div className="mt-8 flex w-full max-w-sm flex-col gap-2 rounded-xl border border-border-light bg-surface-primary-alt p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                <Languages className="size-4" />
                Select Recording Language
              </div>
              <select
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface-chat p-2.5 text-sm font-semibold outline-none ring-offset-2 focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="ar">Arabic (العربية)</option>
                <option value="en">English (English)</option>
                <option value="auto">Auto-Detect Language</option>
              </select>
            </div>
            
            {error && (
              <div className="mt-4 flex w-full max-w-lg items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* 3. Progress State View */}
        {['uploading', 'transcribing', 'summarizing'].includes(status) && (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-6 flex size-20 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/10" />
              <div className="absolute size-16 animate-pulse rounded-full bg-amber-500/20" />
              <Loader2 className="size-8 animate-spin text-amber-500 relative z-10" />
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              {status === 'uploading' && 'Uploading audio file...'}
              {status === 'transcribing' && 'Transcribing conversation...'}
              {status === 'summarizing' && 'Writing AI Summary...'}
            </h3>
            
            {status === 'transcribing' && (
              <p className="text-xs text-text-secondary mt-1 max-w-sm">
                AssemblyAI is recognizing speakers and converting speech to text. This may take a minute or two.
              </p>
            )}
            {status === 'summarizing' && (
              <p className="text-xs text-text-secondary mt-1 max-w-sm">
                Compiling transcript utterances and prompting the chat LLM to write a professional summary breakdown.
              </p>
            )}

            {/* Custom Premium Stepper Progress Indicator */}
            <div className="mt-8 flex w-full max-w-md items-center justify-between text-xs font-semibold text-text-secondary relative">
              <div className="absolute top-[9px] left-[5%] right-[5%] h-0.5 bg-border-medium z-0" />
              
              <div className="flex flex-col items-center gap-1 z-10">
                <div className={cn("size-5 rounded-full flex items-center justify-center text-[10px] font-bold border", status === 'uploading' ? "border-amber-500 bg-amber-500/10 text-amber-500 animate-pulse" : "border-border-heavy bg-surface-primary")}>1</div>
                <span>Upload</span>
              </div>
              <div className="flex flex-col items-center gap-1 z-10">
                <div className={cn("size-5 rounded-full flex items-center justify-center text-[10px] font-bold border", status === 'transcribing' ? "border-amber-500 bg-amber-500/10 text-amber-500 animate-pulse" : "border-border-heavy bg-surface-primary")}>2</div>
                <span>Transcribe</span>
              </div>
              <div className="flex flex-col items-center gap-1 z-10">
                <div className={cn("size-5 rounded-full flex items-center justify-center text-[10px] font-bold border", status === 'summarizing' ? "border-amber-500 bg-amber-500/10 text-amber-500 animate-pulse" : "border-border-heavy bg-surface-primary")}>3</div>
                <span>Summarize</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Failure View */}
        {status === 'failed' && (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-red-500/10 p-4 mb-4 text-red-500">
              <AlertTriangle className="size-10" />
            </div>
            <h3 className="text-sm font-bold text-text-primary">Transcription Pipeline Failed</h3>
            <p className="text-xs text-text-secondary mt-2 max-w-sm">{error || 'An unexpected error occurred during processing.'}</p>
            <Button
              onClick={() => setStatus('idle')}
              variant="outline"
              className="mt-6 text-xs font-bold"
            >
              Upload Another Recording
            </Button>
          </div>
        )}

        {/* 5. Complete View (Summary & Transcript Tabs) */}
        {status === 'completed' && (
          <div className="flex h-full flex-col min-h-0">
            {/* Audio Metadata */}
            <div className="flex items-center gap-4 border border-border-light bg-surface-primary-alt p-3 rounded-xl mb-4 text-xs font-semibold text-text-secondary shadow-sm">
              <div className="flex items-center gap-1">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Format: MP3/Audio</span>
              </div>
              <div className="h-3 w-px bg-border-light" />
              <div>Duration: {formatDuration(audioDuration)}</div>
            </div>

            {/* Custom Tabs Navigation */}
            <div className="flex border-b border-border-light mb-4">
              <Button
                onClick={() => setActiveTab('summary')}
                variant="ghost"
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 rounded-none -mb-px transition-all outline-none h-auto bg-transparent hover:bg-transparent",
                  activeTab === 'summary'
                    ? "border-amber-500 text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                <Sparkles className="size-3.5" />
                AI Summary
              </Button>
              <Button
                onClick={() => setActiveTab('transcript')}
                variant="ghost"
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 rounded-none -mb-px transition-all outline-none h-auto bg-transparent hover:bg-transparent",
                  activeTab === 'transcript'
                    ? "border-amber-500 text-text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                <FileText className="size-3.5" />
                Full Transcript
              </Button>
            </div>

            {/* Tab 1: AI Summary */}
            {activeTab === 'summary' && summaryText && (
              <div className="flex-grow min-h-0 overflow-y-auto leading-relaxed text-sm pr-1">
                <div className="prose prose-invert max-w-none">
                  {summaryText.split('\n').map((line, idx) => {
                    const cleanLine = line.trim();
                    if (cleanLine.startsWith('# ')) {
                      return <h1 key={idx} className="text-base font-bold mt-4 mb-2 text-text-primary">{cleanLine.slice(2)}</h1>;
                    }
                    if (cleanLine.startsWith('## ')) {
                      return <h2 key={idx} className="text-sm font-bold mt-3 mb-2 text-text-primary border-b border-border-light pb-1">{cleanLine.slice(3)}</h2>;
                    }
                    if (cleanLine.startsWith('### ')) {
                      return <h3 key={idx} className="text-xs font-bold mt-3 mb-1.5 text-text-primary">{cleanLine.slice(4)}</h3>;
                    }
                    if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                      return (
                        <div key={idx} className="flex gap-2 text-xs text-text-secondary ml-2 my-1">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{cleanLine.slice(2)}</span>
                        </div>
                      );
                    }
                    if (/^\d+\.\s/.test(cleanLine)) {
                      const num = cleanLine.match(/^\d+\./)?.[0];
                      const content = cleanLine.replace(/^\d+\.\s/, '');
                      return (
                        <div key={idx} className="flex gap-2 text-xs text-text-secondary ml-2 my-1">
                          <span className="text-amber-500 font-bold">{num}</span>
                          <span>{content}</span>
                        </div>
                      );
                    }
                    if (cleanLine === '') {
                      return <div key={idx} className="h-2" />;
                    }
                    return <p key={idx} className="text-xs text-text-secondary my-1.5 leading-relaxed">{line}</p>;
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Full Transcript */}
            {activeTab === 'transcript' && transcriptData && (
              <div className="flex-grow min-h-0 overflow-y-auto pr-1 flex flex-col gap-3">
                {transcriptData.map((turn, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-3 text-xs shadow-sm transition-all hover:bg-surface-hover/20",
                      getSpeakerColor(turn.speaker)
                    )}
                  >
                    <div className="flex items-center justify-between font-bold opacity-80">
                      <span>Speaker {turn.speaker}</span>
                      <span className="font-mono text-[10px] opacity-70">
                        {formatDuration(turn.start)}
                      </span>
                    </div>
                    <p className="text-text-primary leading-relaxed mt-0.5">
                      {turn.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
