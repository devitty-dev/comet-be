import { z } from 'zod';

export const updateMeSchema = z.object({
    body: z.object({
        displayName: z.string().min(1).max(50).optional(),
        bio: z.string().max(300).optional(),
        avatarUrl: z.string().url().optional(),
        phone: z.string().max(30).optional(),
        gender: z.enum(['Male', 'Female', 'Other']).optional(),
        country: z.string().max(100).optional(),
        planetStyleId: z.number().int().min(1).max(7).optional(),
    }),
});

export const discoverQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
    }),
});
