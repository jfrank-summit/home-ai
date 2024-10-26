import { z } from 'zod';

export const assistantSchema = z.object({
    response: z.string(),
    followUpQuestions: z.array(z.string()).optional(),
});

export const researchDecisionSchema = z.object({
    decision: z.enum(['yes', 'no']).describe('Whether to perform research or not.'),
    reason: z.string().describe('Reason for the decision.'),
    query: z.string().optional().describe('Optimal search query if research is needed.'),
});
