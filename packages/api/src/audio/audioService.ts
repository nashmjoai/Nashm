import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import axios from 'axios';
import { createMethods } from '@nashm/data-schemas';

export interface AudioJobResponse {
  jobId: string;
  status: 'pending' | 'uploading' | 'transcribing' | 'summarizing' | 'completed' | 'failed';
  audioFileId: string;
  transcriptData?: Array<{ speaker: string; start: number; end: number; text: string }>;
  summaryText?: string;
  audioDuration?: number;
  error?: string;
}

/**
 * Get the status of an existing AudioJob
 */
export async function getAudioJobStatus(jobId: string, userId: string): Promise<AudioJobResponse | undefined> {
  const AudioJobModel = mongoose.model('AudioJob');
  const job = await AudioJobModel.findOne({ jobId, userId });
  if (!job) {
    return undefined;
  }
  return {
    jobId: job.jobId,
    status: job.status,
    audioFileId: job.audioFileId,
    transcriptData: job.transcriptData,
    summaryText: job.summaryText,
    audioDuration: job.audioDuration,
    error: job.error,
  };
}

/**
 * Enqueues a new audio transcription job
 */
export async function enqueueAudioJob(
  userId: string,
  file: Express.Multer.File,
  languageCode: string | undefined,
  endpoint: string | undefined,
  model: string | undefined,
  tenantId: string | undefined,
  uploadsDir: string,
): Promise<string> {
  const AudioJobModel = mongoose.model('AudioJob');
  const FileModel = mongoose.model('File');

  // 1. Enforce max 2 concurrent jobs limit
  const activeCount = await AudioJobModel.countDocuments({
    userId,
    status: { $in: ['pending', 'uploading', 'transcribing', 'summarizing'] },
  });

  if (activeCount >= 2) {
    throw new Error('MAX_CONCURRENT_JOBS_EXCEEDED');
  }

  const jobId = uuidv4();
  const fileId = uuidv4();
  const webhookSecret = crypto.randomBytes(32).toString('hex');

  // 2. Setup user upload folder and file paths
  const userUploadsDir = path.join(uploadsDir, userId);
  if (!fs.existsSync(userUploadsDir)) {
    fs.mkdirSync(userUploadsDir, { recursive: true });
  }

  const fileExtension = path.extname(file.originalname).slice(1) || 'mp3';
  const finalFilename = `${fileId}__${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const outputPath = path.join(userUploadsDir, finalFilename);

  // Move the temp uploaded file to the permanent uploads folder
  fs.renameSync(file.path, outputPath);

  const dbFilepath = `${userId}/${finalFilename}`;
  const stats = fs.statSync(outputPath);

  // 3. Register the file in the File collection for access security
  await FileModel.create({
    user: userId,
    file_id: fileId,
    bytes: stats.size,
    filename: file.originalname,
    filepath: dbFilepath,
    source: 'local',
    type: file.mimetype,
    context: 'audio-transcribe',
    tenantId,
  });

  // 4. Create the AudioJob in the database
  await AudioJobModel.create({
    jobId,
    userId,
    status: 'pending',
    audioFileId: fileId,
    webhookSecret,
    languageCode,
    endpoint,
    chatModel: model,
    tenantId,
  });

  // 5. Fire off the transcription process asynchronously
  processAudioJob(jobId, userId, outputPath, webhookSecret, languageCode).catch(async (err) => {
    console.error(`[AudioService] Error submitting job ${jobId}:`, err);
    try {
      await AudioJobModel.updateOne(
        { jobId },
        { status: 'failed', error: err.message || String(err) }
      );
    } catch (dbErr) {
      console.error(`[AudioService] Failed to mark job ${jobId} as failed:`, dbErr);
    }
  });

  return jobId;
}

/**
 * Runs the AssemblyAI submit worker process
 */
async function processAudioJob(
  jobId: string,
  userId: string,
  filePath: string,
  webhookSecret: string,
  languageCode?: string,
): Promise<void> {
  const AudioJobModel = mongoose.model('AudioJob');
  await AudioJobModel.updateOne({ jobId }, { status: 'transcribing' });

  const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyApiKey) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is not defined.');
  }

  const serverDomain = process.env.DOMAIN_SERVER || 'http://localhost:3080';
  const webhookUrl = `${serverDomain}/api/audio/webhook/${jobId}`;

  const pythonScriptPath = path.resolve(process.cwd(), 'packages', 'api', 'src', 'audio', 'worker.py');

  return new Promise<void>((resolve, reject) => {
    const args = [
      pythonScriptPath,
      '--file',
      filePath,
      '--apiKey',
      assemblyApiKey,
      '--webhookUrl',
      webhookUrl,
      '--webhookSecret',
      webhookSecret,
    ];

    if (languageCode && languageCode !== 'auto') {
      args.push('--languageCode', languageCode);
    }

    const pyProcess = spawn('python', args);

    let stdout = '';
    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    let stderr = '';
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}. Error: ${stderr}`));
      } else {
        try {
          const res = JSON.parse(stdout.trim());
          if (res && res.id) {
            await AudioJobModel.updateOne(
              { jobId },
              { assemblyTranscriptId: res.id }
            );
          }
        } catch (e) {
          console.warn('[AudioService] Failed to parse worker stdout JSON:', e);
        }
        resolve();
      }
    });
  });
}


/**
 * Handles incoming webhooks from AssemblyAI
 */
export async function handleTranscriptionWebhook(
  jobId: string,
  transcriptId: string,
  status: string,
  errorMsg?: string,
): Promise<void> {
  const AudioJobModel = mongoose.model('AudioJob');

  // 1. Perform atomic status transition from 'transcribing' to 'summarizing'
  // Only one request can win this atomic transition, preventing duplicate processing
  const job = await AudioJobModel.findOneAndUpdate(
    { jobId, status: 'transcribing' },
    { status: 'summarizing' },
    { new: false }
  );

  if (!job) {
    // Already processed, wrong status, or doesn't exist
    return;
  }

  try {
    if (status === 'error') {
      throw new Error(errorMsg || 'AssemblyAI transcription failed');
    }

    // 2. Fetch the transcript data from AssemblyAI
    const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyApiKey) {
      throw new Error('ASSEMBLYAI_API_KEY environment variable is not defined.');
    }

    const res = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        Authorization: assemblyApiKey,
      },
    });

    const transcriptData = res.data;
    if (!transcriptData) {
      throw new Error('AssemblyAI returned empty transcript data');
    }

    const duration = transcriptData.audio_duration; // duration in seconds
    if (duration > 7200) {
      throw new Error('Audio duration exceeds the maximum limit of 2 hours.');
    }

    // Map utterances converting timestamps from milliseconds to seconds
    const utterances = (transcriptData.utterances || []).map((u: any) => ({
      speaker: String(u.speaker),
      start: u.start / 1000,
      end: u.end / 1000,
      text: u.text,
    }));

    // 3. Save transcript data and duration
    await AudioJobModel.updateOne(
      { jobId },
      {
        transcriptData: utterances,
        audioDuration: duration,
      }
    );

    // 4. Generate the AI Summary
    const updatedJob = await AudioJobModel.findOne({ jobId });
    await generateAISummary(updatedJob);
  } catch (err: any) {
    console.error(`[AudioService] Error processing webhook callback for ${jobId}:`, err);
    await AudioJobModel.updateOne(
      { jobId },
      {
        status: 'failed',
        error: err.message || String(err),
      }
    );
  }
}

/**
 * Triggers LLM completion to summarize transcript
 */
async function generateAISummary(job: any): Promise<void> {
  const AudioJobModel = mongoose.model('AudioJob');
  const userId = job.userId.toString();
  const endpoint = job.endpoint || 'openAI';
  const model = job.chatModel || 'gpt-4o';


  try {
    const methods = createMethods(mongoose);
    let apiKey = process.env.OPENAI_API_KEY;
    let baseURL = process.env.OPENAI_REVERSE_PROXY || 'https://api.openai.com/v1';

    // Retrieve user-provided credentials if any are defined
    try {
      const userValues = await methods.getUserKeyValues({ userId, name: endpoint });
      if (userValues?.apiKey) {
        apiKey = userValues.apiKey;
      }
      if (userValues?.baseURL) {
        baseURL = userValues.baseURL;
      }
    } catch {
      // Ignore errors and fall back to system env
    }

    if (!apiKey) {
      throw new Error(`API key is missing for endpoint: ${endpoint}`);
    }

    const transcriptText = (job.transcriptData || [])
      .map((u: any) => `[Speaker ${u.speaker}] (${formatTimestamp(u.start)}): ${u.text}`)
      .join('\n');

    const prompt = `You are an expert AI summarizer. Below is a speaker-diarized transcript of an audio recording.
Please generate a premium, structured summary of the conversation.

Your summary must include:
1. Key Points: A bulleted list of the main topics and takeaways.
2. Action Items: A list of tasks, decisions, or follow-ups identified in the conversation (if applicable).
3. Speaker Breakdown: A summary of what each distinct speaker discussed.

Format your output in clean Markdown.

Transcript:
${transcriptText}`;

    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const summaryText = response.data?.choices?.[0]?.message?.content;
    if (!summaryText) {
      throw new Error('LLM response did not contain message content.');
    }

    await AudioJobModel.updateOne(
      { jobId: job.jobId },
      {
        status: 'completed',
        summaryText,
      }
    );
  } catch (err: any) {
    console.error(`[AudioService] Error generating summary for ${job.jobId}:`, err);
    await AudioJobModel.updateOne(
      { jobId: job.jobId },
      {
        status: 'failed',
        error: `Summary generation failed: ${err.message || String(err)}`,
      }
    );
  }
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}
