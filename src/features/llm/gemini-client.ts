import { extractApiErrorMessage } from '@/features/llm/api-error';
import { buildGeminiInteractionsUrl } from '@/features/llm/api-url';
import { GEMINI_API_REVISION } from '@/shared/constants';
import { toGeminiInteractionModelId } from '@/shared/providers';

export type GeminiInteractionParams = {
  model: string;
  input: string;
  system_instruction?: string;
  response_format?: Record<string, unknown>;
  generation_config?: {
    temperature?: number;
    max_output_tokens?: number;
    thinking_level?: 'minimal' | 'low' | 'medium' | 'high';
  };
};

export type GeminiInteractionResult = {
  output_text?: string;
};

type InteractionContent = {
  type?: string;
  text?: string;
};

type InteractionStep = {
  type?: string;
  content?: InteractionContent | InteractionContent[];
};

type InteractionPayload = GeminiInteractionResult & {
  steps?: InteractionStep[];
  outputs?: InteractionStep[];
  error?: { message?: string };
};

export class GeminiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GeminiRequestError';
    this.status = status;
  }
}

const SKIP_CONTENT_TYPES = new Set(['thought', 'function_call', 'image', 'audio', 'video']);
const SKIP_STEP_TYPES = new Set(['user_input', 'thought', 'function_call']);

function asContentList(content: InteractionStep['content']): InteractionContent[] {
  if (!content) {
    return [];
  }
  return Array.isArray(content) ? content : [content];
}

function collectTextFromContent(content: InteractionStep['content']): string[] {
  const parts: string[] = [];
  for (const item of asContentList(content)) {
    if (item.type && SKIP_CONTENT_TYPES.has(item.type)) {
      continue;
    }
    if ((!item.type || item.type === 'text') && item.text?.trim()) {
      parts.push(item.text);
    }
  }
  return parts;
}

export function extractInteractionOutputText(payload: InteractionPayload): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const steps = payload.steps ?? payload.outputs ?? [];
  for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = steps[stepIndex];
    if (step.type && SKIP_STEP_TYPES.has(step.type)) {
      continue;
    }
    const parts = collectTextFromContent(step.content);
    if (parts.length > 0) {
      return parts.join('\n').trim();
    }
  }

  return '';
}

export type GeminiClient = {
  createInteraction(params: GeminiInteractionParams): Promise<GeminiInteractionResult>;
};

export function createGeminiClient(
  apiKey: string,
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): GeminiClient {
  const endpoint = buildGeminiInteractionsUrl(baseUrl);

  return {
    createInteraction: async (params) => {
      const model = toGeminiInteractionModelId(params.model);
      const body: Record<string, unknown> = {
        model,
        input: params.input,
        system_instruction: params.system_instruction,
        generation_config: params.generation_config,
      };
      if (params.response_format) {
        body.response_format = params.response_format;
      }

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
          'Api-Revision': GEMINI_API_REVISION,
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json() as InteractionPayload;
      if (!response.ok) {
        throw new GeminiRequestError(
          extractApiErrorMessage(payload, response.status),
          response.status,
        );
      }

      const outputText = extractInteractionOutputText(payload);
      return { output_text: outputText };
    },
  };
}

export function mapGeminiClientError(error: unknown): {
  message: string;
  status: number | null;
  retryable: boolean;
} {
  if (error instanceof GeminiRequestError) {
    return {
      message: error.message,
      status: error.status,
      retryable: error.status === 429 || error.status >= 500,
    };
  }
  if (error instanceof TypeError) {
    return { message: error.message, status: null, retryable: true };
  }
  if (error instanceof Error) {
    const retryable = /unable to make request|failed to fetch/i.test(error.message);
    return { message: error.message, status: null, retryable };
  }
  return { message: String(error), status: null, retryable: false };
}
