import { describe, expect, it, vi } from 'vitest';
import {
  createGeminiClient,
  extractInteractionOutputText,
} from '@/features/llm/gemini-client';
import { GEMINI_API_REVISION } from '@/shared/constants';
import { TRANSLATION_RESPONSE_FORMAT } from '@/features/llm/translation-schema';

describe('extractInteractionOutputText', () => {
  it('reads output_text when present', () => {
    expect(extractInteractionOutputText({ output_text: 'hello' })).toBe('hello');
  });

  it('reads last model_output text and skips thought blocks', () => {
    expect(extractInteractionOutputText({
      steps: [
        { type: 'user_input', content: [{ type: 'text', text: 'prompt' }] },
        {
          type: 'thought',
          content: [{ type: 'text', text: 'planning' }],
        },
        {
          type: 'model_output',
          content: [
            { type: 'thought', text: 'internal' },
            { type: 'text', text: '0\t你好' },
          ],
        },
      ],
    })).toBe('0\t你好');
  });

  it('reads plain content text from the last step', () => {
    expect(extractInteractionOutputText({
      steps: [
        { content: [{ text: '0\t你好' }] },
      ],
    })).toBe('0\t你好');
  });
});

describe('createGeminiClient', () => {
  it('posts bare model ids with Api-Revision and response_format', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        steps: [
          {
            type: 'model_output',
            content: [{ type: 'text', text: '{"items":[{"id":"0","text":"你好"}]}' }],
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const client = createGeminiClient(
      'test-key',
      'https://generativelanguage.googleapis.com/v1beta/openai',
      fetchImpl,
    );

    const result = await client.createInteraction({
      model: 'models/gemini-2.5-flash-lite',
      input: 'translate',
      system_instruction: 'system',
      response_format: { ...TRANSLATION_RESPONSE_FORMAT },
      generation_config: { temperature: 0 },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-key',
          'Api-Revision': GEMINI_API_REVISION,
        }),
        body: JSON.stringify({
          model: 'gemini-2.5-flash-lite',
          input: 'translate',
          system_instruction: 'system',
          generation_config: { temperature: 0 },
          response_format: TRANSLATION_RESPONSE_FORMAT,
        }),
      }),
    );
    expect(result.output_text).toBe('{"items":[{"id":"0","text":"你好"}]}');
  });
});
