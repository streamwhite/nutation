export const TRANSLATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['id', 'text'],
      },
    },
  },
  required: ['items'],
} as const;

export const TRANSLATION_RESPONSE_FORMAT = {
  type: 'text',
  mime_type: 'application/json',
  schema: TRANSLATION_RESPONSE_SCHEMA,
} as const;
