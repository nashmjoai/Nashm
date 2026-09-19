interface ProviderErrorDetails {
  code?: string;
  message?: string;
  stage?: string;
  type?: string;
}

interface ProviderError extends Error {
  code?: string;
  error?: ProviderErrorDetails;
  status?: number;
  type?: string;
}

function isProviderError(error: unknown): error is ProviderError {
  return error instanceof Error;
}

function getProviderErrorCode(error: ProviderError): string {
  return error.error?.code ?? error.code ?? '';
}

export function isAgentAbortError(error: unknown): boolean {
  if (!isProviderError(error)) {
    return false;
  }

  return error.name === 'AbortError' || error.code === 'ABORT_ERR';
}

export function getAgentErrorMessage(error: unknown): string {
  if (!isProviderError(error)) {
    return 'The request could not be completed. Please try again.';
  }

  const code = getProviderErrorCode(error);
  if (code === 'guardrail_unavailable') {
    return "HUMAIN's safety service is temporarily unavailable. The request was retried, but the service did not recover. Please try again shortly.";
  }

  if (code === 'non_stream_required') {
    return 'This HUMAIN access level does not support streaming. The compatible non-streaming mode is enabled; please retry the request.';
  }

  if (error.status === 429) {
    return 'The model provider is receiving too many requests. Please wait a moment and try again.';
  }

  if (error.status === 401 || error.status === 403) {
    return 'The model provider rejected the configured credentials or access level.';
  }

  if (error.status != null && error.status >= 500) {
    return 'The model provider is temporarily unavailable. Please try again shortly.';
  }

  return 'The request could not be completed. Please try again.';
}
