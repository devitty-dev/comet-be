import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/response';

export const validate = (schema: ZodSchema<any>) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', (error as any).errors);
        }
        next(error);
    }
};
