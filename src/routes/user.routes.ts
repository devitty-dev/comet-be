import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateMeSchema, discoverQuerySchema } from '../validators/user.validator';
import * as userController from '../controllers/user.controller';

const router = Router();

// Protected literal routes must come before /:username to avoid shadowing
router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, validate(updateMeSchema), userController.updateMe);
router.get('/discover', authenticate, validate(discoverQuerySchema), userController.discoverUsers);

// Public dynamic route — matches any username (comes last so /me and /discover win above)
router.get('/:username', userController.getUserByUsername);

export default router;
