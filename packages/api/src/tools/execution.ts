import {
  appendCodeSessionFileSummary,
  appendFailedExecutionFileReminder,
  appendTmpScratchReminder,
  emptyOutputMessage,
  getCodeBaseURL,
} from '@librechat/agents';
import type { ServerRequest } from '~/types';
import {
  codeServerHttpAgent,
  codeServerHttpsAgent,
  createAxiosInstance,
} from '~/utils';
import { getCodeApiAuthHeaders } from '~/auth';

export interface DirectCodeFile {
  id?: string;
  name?: string;
  content?: string;
  buffer?: string;
  encoding?: 'utf8' | 'base64' | 'hex';
  session_id?: string;
  storage_session_id?: string;
  resource_id?: string;
  kind?: string;
  version?: number;
}

export interface DirectCodeExecutionInput {
  lang: string;
  code: string;
  args?: string[];
  stdin?: string;
  files?: DirectCodeFile[];
  session_id?: string;
  run_timeout?: number;
  compile_timeout?: number;
  run_memory_limit?: number;
  compile_memory_limit?: number;
}

interface CodeApiExecutionPayload {
  lang: string;
  code: string;
  args?: string[];
  stdin?: string;
  files?: DirectCodeFile[];
  session_id?: string;
  run_timeout?: number;
  compile_timeout?: number;
  run_memory_limit?: number;
  compile_memory_limit?: number;
}

export interface CodeApiOutputFile {
  id: string;
  name: string;
  session_id?: string;
  storage_session_id?: string;
  resource_id?: string;
  kind?: string;
  version?: number;
  inherited?: boolean;
}

interface CodeApiExecutionResponse {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
  session_id?: string;
  files?: CodeApiOutputFile[];
}

export interface DirectCodeExecutionResult {
  content: string;
  artifact: {
    session_id?: string;
    files?: CodeApiOutputFile[];
  };
}

const axios = createAxiosInstance();

function normalizeArgs(args: string[] | undefined): string[] | undefined {
  if (!args || args.length === 0) {
    return undefined;
  }
  return args.map((arg) => String(arg));
}

function buildPayload(input: DirectCodeExecutionInput): CodeApiExecutionPayload {
  return {
    lang: input.lang,
    code: input.code,
    ...(normalizeArgs(input.args) ? { args: normalizeArgs(input.args) } : {}),
    ...(typeof input.stdin === 'string' ? { stdin: input.stdin } : {}),
    ...(input.files && input.files.length > 0 ? { files: input.files } : {}),
    ...(input.session_id ? { session_id: input.session_id } : {}),
    ...(typeof input.run_timeout === 'number' ? { run_timeout: input.run_timeout } : {}),
    ...(typeof input.compile_timeout === 'number'
      ? { compile_timeout: input.compile_timeout }
      : {}),
    ...(typeof input.run_memory_limit === 'number'
      ? { run_memory_limit: input.run_memory_limit }
      : {}),
    ...(typeof input.compile_memory_limit === 'number'
      ? { compile_memory_limit: input.compile_memory_limit }
      : {}),
  };
}

function formatExecutionOutput(result: CodeApiExecutionResponse, code: string): string {
  let formattedOutput = '';
  if (result.stdout) {
    formattedOutput += `stdout:\n${result.stdout}\n`;
  } else {
    formattedOutput += emptyOutputMessage;
  }
  if (result.stderr) {
    formattedOutput += `stderr:\n${result.stderr}\n`;
  }

  return appendCodeSessionFileSummary(
    appendTmpScratchReminder(formattedOutput, code),
    result.files,
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown execution error';
}

export async function executeDirectCode(
  input: DirectCodeExecutionInput,
  req?: ServerRequest,
): Promise<DirectCodeExecutionResult> {
  const baseURL = getCodeBaseURL();
  const authHeaders = await getCodeApiAuthHeaders(req);

  try {
    const response = await axios.post<CodeApiExecutionResponse>(
      `${baseURL}/exec`,
      buildPayload(input),
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nashm/1.0',
          ...authHeaders,
        },
        httpAgent: codeServerHttpAgent,
        httpsAgent: codeServerHttpsAgent,
        timeout: 30_000,
      },
    );
    const result = response.data;
    return {
      content: formatExecutionOutput(result, input.code),
      artifact: {
        session_id: result.session_id,
        ...(result.files && result.files.length > 0 ? { files: result.files } : {}),
      },
    };
  } catch (error: unknown) {
    const message = appendFailedExecutionFileReminder(getErrorMessage(error), input.code);
    throw new Error(`Execution error:\n\n${message}`);
  }
}
