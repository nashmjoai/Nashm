import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import mongoose from 'mongoose';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateOfficeArtifact } from 'nashm-data-provider';

import type { NashmOfficeArtifact } from 'nashm-data-provider';

type ExportFormat = 'office' | 'pdf';

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  error?: string;
}

const OFFICE_MIME_TYPES: Record<NashmOfficeArtifact['kind'], string> = {
  slides: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  document: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  workbook: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function getOfficeExtension(kind: NashmOfficeArtifact['kind']): 'pptx' | 'xlsx' | 'docx' {
  if (kind === 'slides') {
    return 'pptx';
  }
  if (kind === 'workbook') {
    return 'xlsx';
  }
  return 'docx';
}

function getExportExtension(kind: NashmOfficeArtifact['kind'], format: ExportFormat): string {
  if (format === 'pdf') {
    return 'pdf';
  }
  return getOfficeExtension(kind);
}

function getExportMimeType(kind: NashmOfficeArtifact['kind'], format: ExportFormat): string {
  if (format === 'pdf') {
    return 'application/pdf';
  }
  return OFFICE_MIME_TYPES[kind];
}

function sanitizeFilename(title: string): string {
  const sanitized = title.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return sanitized || 'export';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function getJobStatus(jobId: string): Promise<ExportJob | undefined> {
  const ExportJobModel = mongoose.model('ExportJob');
  const job = await ExportJobModel.findOne({ jobId });
  if (!job) {
    return undefined;
  }
  const result: ExportJob = {
    id: job.jobId,
    status: job.status,
  };
  if (job.status === 'completed' && job.resultFileId) {
    result.downloadUrl = `/api/files/download/${job.userId}/${job.resultFileId}`;
  }
  if (job.status === 'failed' && job.error) {
    result.error = job.error;
  }
  return result;
}

export async function enqueueExportJob(
  userId: string,
  artifactData: NashmOfficeArtifact,
  format: string,
  uploadsDir: string,
): Promise<string> {
  if (!validateOfficeArtifact(artifactData)) {
    throw new Error('Invalid office artifact schema payload');
  }

  const jobId = uuidv4();
  const ExportJobModel = mongoose.model('ExportJob');

  await ExportJobModel.create({
    jobId,
    userId,
    status: 'pending',
  });

  processExportJob(jobId, userId, artifactData, format, uploadsDir).catch(async (err) => {
    console.error(`[ExportService] Error processing job ${jobId}:`, err);
    try {
      await ExportJobModel.updateOne({ jobId }, { status: 'failed', error: getErrorMessage(err) });
    } catch (dbErr) {
      console.error(`[ExportService] Failed to mark job ${jobId} as failed in DB:`, dbErr);
    }
  });

  return jobId;
}

async function processExportJob(
  jobId: string,
  userId: string,
  artifactData: NashmOfficeArtifact,
  format: string,
  uploadsDir: string,
): Promise<void> {
  const ExportJobModel = mongoose.model('ExportJob');
  await ExportJobModel.updateOne({ jobId }, { status: 'processing' });

  const exportFormat: ExportFormat = format === 'pdf' ? 'pdf' : 'office';
  const kind = artifactData.kind;
  const title = artifactData.title || 'export';
  const fileExtension = getExportExtension(kind, exportFormat);
  const finalFilename = `${sanitizeFilename(title)}.${fileExtension}`;

  const tempJsonDir = path.join(uploadsDir, 'temp');
  if (!fs.existsSync(tempJsonDir)) {
    fs.mkdirSync(tempJsonDir, { recursive: true });
  }

  const tempJsonPath = path.join(tempJsonDir, `${jobId}.json`);
  fs.writeFileSync(tempJsonPath, JSON.stringify(artifactData, null, 2), 'utf-8');

  const userUploadsDir = path.join(uploadsDir, userId);
  if (!fs.existsSync(userUploadsDir)) {
    fs.mkdirSync(userUploadsDir, { recursive: true });
  }

  const fileId = uuidv4();
  const outputFileName = `${fileId}__${finalFilename}`;
  const outputPath = path.join(userUploadsDir, outputFileName);
  const intermediateOfficePath =
    exportFormat === 'pdf'
      ? path.join(
          userUploadsDir,
          `${fileId}__${sanitizeFilename(title)}.${getOfficeExtension(kind)}`,
        )
      : outputPath;

  const pythonScriptPath = path.resolve(
    process.cwd(),
    'packages',
    'api',
    'src',
    'artifacts',
    'export.py',
  );

  return new Promise<void>((resolve, reject) => {
    const pyProcess = spawn('python', [
      pythonScriptPath,
      '--input',
      tempJsonPath,
      '--output',
      intermediateOfficePath,
      '--format',
      'office',
    ]);

    let stderr = '';
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('close', async (code) => {
      try {
        if (fs.existsSync(tempJsonPath)) {
          fs.unlinkSync(tempJsonPath);
        }
      } catch {
        // best-effort cleanup
      }

      if (code !== 0) {
        console.error(`[ExportService] Exporter exited with code ${code}. Stderr: ${stderr}`);
        try {
          await ExportJobModel.updateOne(
            {
              jobId,
            },
            {
              status: 'failed',
              error: `Exporter exited with code ${code}. Stderr: ${stderr}`,
            },
          );
        } catch (dbErr) {
          console.error('[ExportService] Failed to mark job as failed in DB:', dbErr);
        }
        reject(new Error(`Exporter failed with code ${code}`));
        return;
      }

      try {
        if (exportFormat === 'pdf') {
          convertOfficeToPdf(intermediateOfficePath, outputPath);
          try {
            fs.unlinkSync(intermediateOfficePath);
          } catch {
            // best-effort cleanup
          }
        }

        const FileModel = mongoose.model('File');
        const stats = fs.statSync(outputPath);
        const dbFilepath = `${userId}/${outputFileName}`;

        await FileModel.create({
          user: userId,
          file_id: fileId,
          bytes: stats.size,
          filename: finalFilename,
          filepath: dbFilepath,
          source: 'local',
          type: getExportMimeType(kind, exportFormat),
          context: 'input',
        });

        await ExportJobModel.updateOne({ jobId }, { status: 'completed', resultFileId: fileId });
        resolve();
      } catch (dbErr: unknown) {
        console.error('[ExportService] Error creating file DB record:', dbErr);
        const message = getErrorMessage(dbErr);
        try {
          await ExportJobModel.updateOne({ jobId }, { status: 'failed', error: message });
        } catch (updateErr) {
          console.error('[ExportService] Failed to mark job as failed in DB:', updateErr);
        }
        reject(dbErr);
      }
    });
  });
}

function convertOfficeToPdf(inputPath: string, outputPath: string): void {
  const outputDir = path.dirname(outputPath);
  const candidates = ['soffice', 'libreoffice'];
  let lastError = '';

  for (const command of candidates) {
    const result = spawnSync(command, [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath,
    ]);

    if (result.status === 0) {
      const generatedPath = path.join(
        outputDir,
        `${path.basename(inputPath, path.extname(inputPath))}.pdf`,
      );
      if (generatedPath !== outputPath && fs.existsSync(generatedPath)) {
        fs.renameSync(generatedPath, outputPath);
      }
      if (fs.existsSync(outputPath)) {
        return;
      }
      lastError = 'LibreOffice completed but did not create a PDF file.';
      continue;
    }

    lastError = result.stderr?.toString() || result.error?.message || `${command} failed`;
  }

  throw new Error(`PDF export requires LibreOffice/soffice. ${lastError}`);
}
