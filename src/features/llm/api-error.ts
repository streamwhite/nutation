type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

export function extractApiErrorMessage(payload: unknown, status: number): string {
  if (Array.isArray(payload)) {
    const first = payload[0] as ApiErrorPayload | undefined;
    if (first?.error?.message) {
      return first.error.message;
    }
  }

  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = (payload as ApiErrorPayload).error?.message;
    if (message) {
      return message;
    }
  }

  return `HTTP ${status}`;
}
