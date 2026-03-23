import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.middleware';
import { googleAuthSchema, appleAuthSchema, requestParamsSchema, emailRegisterSchema, emailLoginSchema } from '../validators/auth.validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

const router = Router();

router.post('/email/register', authLimiter, validate(emailRegisterSchema), authController.emailRegister);
router.post('/email/login', authLimiter, validate(emailLoginSchema), authController.emailLogin);
router.post('/google', authLimiter, validate(googleAuthSchema), authController.googleAuth);
router.post('/apple', authLimiter, validate(appleAuthSchema), authController.appleAuth);
router.post('/refresh', authLimiter, validate(requestParamsSchema), authController.refreshToken);
router.post('/logout', authenticate, validate(requestParamsSchema), authController.logout);

export default router;
