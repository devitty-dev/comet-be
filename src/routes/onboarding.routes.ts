import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import * as onboardingController from '../controllers/onboarding.controller';
import {
    usernameSchema,
    checkUsernameSchema,
    profileSchema,
    tagsSchema
} from '../validators/onboarding.validator';

const router = Router();

// Public (or authed, but public is fine for options)
router.get('/tags/options', onboardingController.getTagsOptions);

// Protected routes
router.use(authenticate);

router.post('/username', validate(usernameSchema), onboardingController.setUsername);
router.get('/username/check', validate(checkUsernameSchema), onboardingController.checkUsername);
router.post('/profile', validate(profileSchema), onboardingController.updateProfile);
router.post('/tags', validate(tagsSchema), onboardingController.setTags);
router.post('/complete', onboardingController.completeOnboarding);

export default router;
