import express, { Router } from 'express';
import { z } from 'zod';
import { assistantAgent } from '../agents/assistantAgent';
import logger from '../logger';

const router: Router = express.Router();

// Request validation schema
const assistantRequestSchema = z.object({
    userRequest: z.string().min(1, 'User request cannot be empty'),
});

router.post('/chat', async (req, res) => {
    try {
        // Validate request body
        const validatedBody = assistantRequestSchema.parse(req.body);

        logger.info('Assistant API - Received chat request', {
            userRequest: validatedBody.userRequest,
        });

        const response = await assistantAgent({
            userRequest: validatedBody.userRequest,
        });

        logger.info('Assistant API - Successfully processed chat request');

        res.status(200).json({
            success: true,
            data: response,
        });
    } catch (error) {
        logger.error('Assistant API - Error processing chat request', { error });

        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Invalid request body',
                details: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
});

export default router;
