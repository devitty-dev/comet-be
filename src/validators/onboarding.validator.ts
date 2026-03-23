import { z } from 'zod';

export const usernameSchema = z.object({
    body: z.object({
        username: z.string()
            .min(3, 'Username must be at least 3 characters')
            .max(20, 'Username must be at most 20 characters')
            .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    }),
});

export const checkUsernameSchema = z.object({
    query: z.object({
        username: z.string()
            .min(3, 'Username must be at least 3 characters')
            .max(20, 'Username must be at most 20 characters')
            .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    }),
});

export const profileSchema = z.object({
    body: z.object({
        displayName: z.string().min(1).max(50),
        dateOfBirth: z.string().datetime({ message: "Invalid ISO date string" }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
        avatarUrl: z.string().url().refine(
            (url) => url.startsWith('https://'),
            { message: 'Avatar URL must use HTTPS' }
        ).optional(),
    }),
});

export const tagsSchema = z.object({
    body: z.object({
        tags: z.array(z.string()).min(1).max(10),
    }),
});
