import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

// Generate accessToken
export const generateAccessToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

// Verify accessToken
export const verifyAccessToken = (token: string): string | jwt.JwtPayload => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        throw new Error('Invalid token');
    }
};

// Generate random refresh token
export const generateRefreshTokenString = (): string => {
    return randomBytes(40).toString('hex');
};
