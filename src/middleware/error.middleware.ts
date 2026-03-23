import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { AppError } from '../utils/errors';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);

    // Custom application errors
    if (err instanceof AppError) {
        return errorResponse(res, err.statusCode, err.code, err.message);
    }

    // JWT errors (thrown from jwt.ts as plain Error with known messages)
    if (err.message === 'Invalid token' || err.message === 'Token expired') {
        return errorResponse(res, 401, 'UNAUTHORIZED', err.message);
    }

    if (err.message === 'Token reused') {
        return errorResponse(res, 403, 'FORBIDDEN', 'Token reused. Please login again.');
    }

    // Zod validation errors
    if (err.name === 'ZodError') {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', err.errors);
    }

    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Internal Server Error');
};
