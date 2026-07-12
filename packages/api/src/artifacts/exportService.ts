import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { validateOfficeArtifact } from 'nashm-data-provider';

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
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
  return result;
}

export async function enqueueExportJob(
  userId: string,
  artifactData: any,
  format: string,
  uploadsDir: string,
): Promise<string> {
  // Defense in depth: validate the payload before processing
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

  // Run job asynchronously
  processExportJob(jobId, userId, artifactData, format, uploadsDir).catch(async (err) => {
    console.error(`[ExportService] Error processing job ${jobId}:`, err);
    try {
      await ExportJobModel.updateOne({ jobId }, { status: 'failed', error: err.message || String(err) });
    } catch (dbErr) {
      console.error(`[ExportService] Failed to mark job ${jobId} as failed in DB:`, dbErr);
    }
  });

  return jobId;
}

async function processExportJob(
  jobId: string,
  userId: string,
  artifactData: any,
  format: string,
  uploadsDir: string,
): Promise<void> {
  const ExportJobModel = mongoose.model('ExportJob');
  await ExportJobModel.updateOne({ jobId }, { status: 'processing' });

  const kind = artifactData.kind;
  const title = artifactData.title || 'export';
  const fileExtension = kind === 'slides' ? 'pptx' : kind === 'workbook' ? 'xlsx' : 'docx';
  const finalFilename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${fileExtension}`;

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

  const pythonScriptPath = path.resolve(process.cwd(), 'packages', 'api', 'src', 'artifacts', 'export.py');

  return new Promise<void>((resolve, reject) => {
    const pyProcess = spawn('python', [
      pythonScriptPath,
      '--input',
      tempJsonPath,
      '--output',
      outputPath,
      '--format',
      format === 'pdf' ? 'pdf' : 'office',
    ]);

    let stderr = '';
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('close', async (code) => {
      // Clean up JSON
      try {
        if (fs.existsSync(tempJsonPath)) {
          fs.unlinkSync(tempJsonPath);
        }
      } catch (err) {
        // ignore
      }

      if (code !== 0) {
        console.error(`[ExportService] Exporter exited with code ${code}. Stderr: ${stderr}`);
        try {
          await ExportJobModel.updateOne({
            jobId,
          }, {
            status: 'failed',
            error: `Exporter exited with code ${code}. Stderr: ${stderr}`,
          });
        } catch (dbErr) {
          console.error('[ExportService] Failed to mark job as failed in DB:', dbErr);
        }
        reject(new Error(`Exporter failed with code ${code}`));
        return;
      }

      try {
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
          type: kind === 'slides'
            ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            : kind === 'workbook'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          context: 'input',
        });

        await ExportJobModel.updateOne({ jobId }, { status: 'completed', resultFileId: fileId });
        resolve();
      } catch (dbErr: any) {
        console.error('[ExportService] Error creating file DB record:', dbErr);
        try {
          await ExportJobModel.updateOne({ jobId }, { status: 'failed', error: dbErr.message || String(dbErr) });
        } catch (updateErr) {
          console.error('[ExportService] Failed to mark job as failed in DB:', updateErr);
        }
        reject(dbErr);
      }
    });
  });
}
