type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

const GEMINI_MODELS_RESOURCE_PREFIX = /\bmodels\//g;

export function sanitizeApiErrorMessage(message: string): string {
  return message.replace(GEMINI_MODELS_RESOURCE_PREFIX, '');
}

export function extractApiErrorMessage(payload: unknown, status: number): string {
  if (Array.isArray(payload)) {
    const first = payload[0] as ApiErrorPayload | undefined;
    if (first?.error?.message) {
      return sanitizeApiErrorMessage(first.error.message);
    }
  }

  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = (payload as ApiErrorPayload).error?.message;
    if (message) {
      return sanitizeApiErrorMessage(message);
    }
  }

  return `HTTP ${status}`;
}
