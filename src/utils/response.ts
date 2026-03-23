import { Response } from 'express';

export const successResponse = (res: Response, data: any, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
    });
};

export const errorResponse = (
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: any
) => {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details,
        },
    });
};
