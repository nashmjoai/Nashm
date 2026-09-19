import { getAgentErrorMessage, isAgentAbortError } from './errors';

function providerError({
  code,
  status,
}: {
  code?: string;
  status?: number;
}): Error & { error?: { code: string }; status?: number } {
  return Object.assign(new Error(code ?? 'Provider error'), {
    error: code ? { code } : undefined,
    status,
  });
}

describe('agent provider errors', () => {
  it('explains a HUMAIN guardrail outage without exposing a raw provider error', () => {
    const message = getAgentErrorMessage(
      providerError({ code: 'guardrail_unavailable', status: 503 }),
    );

    expect(message).toContain("HUMAIN's safety service is temporarily unavailable");
    expect(message).toContain('retried');
    expect(message).not.toContain('503');
  });

  it('explains the guarded-access streaming restriction', () => {
    const message = getAgentErrorMessage(
      providerError({ code: 'non_stream_required', status: 400 }),
    );

    expect(message).toContain('does not support streaming');
    expect(message).toContain('non-streaming mode');
  });

  it('uses a safe message for unknown failures', () => {
    expect(getAgentErrorMessage(new Error('secret upstream detail'))).toBe(
      'The request could not be completed. Please try again.',
    );
  });

  it('recognizes standard abort errors', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';

    expect(isAgentAbortError(error)).toBe(true);
    expect(isAgentAbortError(new Error('failed'))).toBe(false);
  });
});
