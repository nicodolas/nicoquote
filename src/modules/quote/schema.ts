import { z } from 'zod';

export const createQuoteSchema = z.object({
  content: z.string().min(1).max(1000),
  author: z.string().min(1, 'Author is required'),
  tags: z.array(z.string()).optional(),
});

export const updateQuoteSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  author: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
