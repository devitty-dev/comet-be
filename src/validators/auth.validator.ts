import { z } from 'zod';

export const googleAuthSchema = z.object({
    body: z.object({
        idToken: z.string().min(1, 'ID Token is required'),
    }),
});

export const appleAuthSchema = z.object({
    body: z.object({
        identityToken: z.string().min(1, 'Identity Token is required'),
        fullName: z.object({
            givenName: z.string().optional(),
            familyName: z.string().optional(),
        }).optional(),
    }),
});

export const requestParamsSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh Token is required'),
    }),
});

export const emailRegisterSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters').max(72),
        displayName: z.string().min(1, 'Display name is required').max(50),
        age: z.number({ error: 'Age must be a number' }).int().min(13, 'Must be at least 13').max(120, 'Invalid age'),
        phone: z.string().max(30).optional(),
        gender: z.enum(['Male', 'Female', 'Other']).optional(),
        country: z.string().max(100).optional(),
        termsAccepted: z.literal(true, 'You must accept the Terms & Conditions'),
    }),
});

export const emailLoginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
    }),
});
