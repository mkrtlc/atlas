import { z } from 'zod';
import { register, envelope } from '../_helpers';

const TAG = 'AI';

register({
  method: 'post', path: '/ai/test-key', tags: [TAG],
  summary: 'Validate an AI provider API key',
  body: z.object({ provider: z.string(), apiKey: z.string() }),
  response: envelope(z.object({ ok: z.boolean(), message: z.string().optional() })),
});

register({
  method: 'post', path: '/ai/summarize', tags: [TAG],
  summary: 'Generate an AI summary of provided text',
  body: z.object({
    text: z.string(),
    maxLength: z.number().int().optional(),
    style: z.enum(['bullets', 'paragraph', 'tldr']).optional(),
  }),
  response: envelope(z.object({ summary: z.string() })),
});

register({
  method: 'post', path: '/ai/quick-replies', tags: [TAG],
  summary: 'Generate suggested quick replies for a message/email',
  body: z.object({
    context: z.string(),
    count: z.number().int().min(1).max(5).optional(),
  }),
  response: envelope(z.object({ replies: z.array(z.string()) })),
});

register({
  method: 'post', path: '/ai/write-assist', tags: [TAG],
  summary: 'AI writing assistance (rewrite / expand / continue)',
  body: z.object({
    text: z.string(),
    action: z.enum(['rewrite', 'expand', 'shorten', 'continue', 'fix_grammar']),
    tone: z.string().optional(),
  }),
  response: envelope(z.object({ output: z.string() })),
});
