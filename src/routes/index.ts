import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import onboardingRoutes from './onboarding.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/users', userRoutes);

export default router;
