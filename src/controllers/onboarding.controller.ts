import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../services/onboarding.service';
import { successResponse } from '../utils/response';

const onboardingService = new OnboardingService();

export const checkUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.query;
        const available = await onboardingService.isUsernameAvailable(username as string);
        successResponse(res, { available });
    } catch (error) {
        next(error);
    }
};

export const setUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.body;
        const userId = req.user!.id;
        const updatedUsername = await onboardingService.setUsername(userId, username);
        successResponse(res, { username: updatedUsername });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { displayName, dateOfBirth, avatarUrl } = req.body;
        const userId = req.user!.id;

        const user = await onboardingService.updateProfile(userId, displayName, dateOfBirth, avatarUrl);
        successResponse(res, user);
    } catch (error) {
        next(error);
    }
};

export const setTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tags } = req.body;
        const userId = req.user!.id;

        const updatedTags = await onboardingService.setTags(userId, tags);
        successResponse(res, { tags: updatedTags });
    } catch (error) {
        next(error);
    }
};

export const getTagsOptions = (req: Request, res: Response, next: NextFunction) => {
    try {
        const tags = onboardingService.getAvailableTags();
        successResponse(res, { tags });
    } catch (error) {
        next(error);
    }
};

export const completeOnboarding = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const user = await onboardingService.completeOnboarding(userId);
        successResponse(res, user);
    } catch (error) {
        next(error);
    }
};
