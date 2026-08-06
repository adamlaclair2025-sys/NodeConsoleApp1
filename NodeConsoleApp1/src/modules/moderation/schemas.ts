import { z } from 'zod';

export const submitAppealSchema = z.object({
  reason: z.string().trim().min(10, 'Appeal reason is required').max(4000),
});

export const reviewAppealSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  resolution: z.string().trim().min(1).max(4000),
});

export type SubmitAppealInput = z.infer<typeof submitAppealSchema>;
export type ReviewAppealInput = z.infer<typeof reviewAppealSchema>;
