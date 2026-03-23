import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';

const authService = new AuthService();

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { idToken } = req.body;
        const payload = await authService.verifyGoogle(idToken);

        if (!payload || !payload.sub || !payload.email) {
            return errorResponse(res, 400, 'AUTH_FAILED', 'Invalid Google Token');
        }

        const { user, isNewUser } = await authService.findOrCreateUser(
            'google',
            payload.sub,
            payload.email,
            payload.name || payload.email.split('@')[0],
            payload.picture
        );

        const tokens = await authService.generateTokens(user.id, req.headers['user-agent']);

        successResponse(res, { ...tokens, user, isNewUser });
    } catch (error) {
        next(error);
    }
};

export const appleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { identityToken, fullName } = req.body;
        const { sub, email } = await authService.verifyApple(identityToken);

        if (!sub || !email) {
            return errorResponse(res, 400, 'AUTH_FAILED', 'Invalid Apple Token');
        }

        // Name is only provided on first login by Apple
        const displayName = fullName
            ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
            : email.split('@')[0];

        const { user, isNewUser } = await authService.findOrCreateUser(
            'apple',
            sub,
            email,
            displayName
        );

        const tokens = await authService.generateTokens(user.id, req.headers['user-agent']);

        successResponse(res, { ...tokens, user, isNewUser });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const tokens = await authService.refreshToken(refreshToken);
        successResponse(res, tokens);
    } catch (error) {
        next(error);
    }
};

export const emailRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, displayName, age, phone, gender, country } = req.body;
        const { user } = await authService.registerEmail(email, password, displayName, age, phone, gender, country);
        const tokens = await authService.generateTokens(user.id, req.headers['user-agent']);
        successResponse(res, { ...tokens, user, isNewUser: true }, 201);
    } catch (error) {
        next(error);
    }
};

export const emailLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const { user } = await authService.loginEmail(email, password);
        const tokens = await authService.generateTokens(user.id, req.headers['user-agent']);
        successResponse(res, { ...tokens, user, isNewUser: false });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user!.id;
        await authService.revokeToken(refreshToken, userId);
        successResponse(res, { message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};
