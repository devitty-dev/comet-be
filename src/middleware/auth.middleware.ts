import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { query } from '../config/db';
import { errorResponse } from '../utils/response';
import { JwtPayload } from 'jsonwebtoken';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 401, 'UNAUTHORIZED', 'Missing or invalid token');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token) as JwtPayload;

        if (!decoded || !decoded.userId) {
            return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid token payload');
        }

        // Check if user is banned
        // We can fetch the whole user here or just check the status
        // For "Current User" endpoint we need usage of full user, so fetching here is efficient if we attach it
        // But for lightweight checks, maybe just ID.
        // Spec says: "Attaches the user object (or at least userId) to the request"
        // Spec says: "Has a separate check for banned users — if is_banned: true, return 403"

        // Let's fetch the user status
        const userRes = await query('SELECT is_banned FROM users WHERE id = $1', [decoded.userId]);

        if (userRes.rows.length === 0) {
            return errorResponse(res, 401, 'UNAUTHORIZED', 'User not found');
        }

        if (userRes.rows[0].is_banned) {
            return errorResponse(res, 403, 'FORBIDDEN', 'Account suspended');
        }

        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        next(error);
    }
};
