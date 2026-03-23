import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { successResponse, errorResponse } from '../utils/response';

const USER_SELECT_COLUMNS = `u.id, u.email, u.username, u.display_name, u.avatar_url, u.bio, u.date_of_birth, u.level, u.xp, u.xp_to_next_level, u.is_onboarded, u.phone, u.gender, u.country, u.planet_style_id, u.comets_count, u.gifts_count, u.messages_sent_count, u.messages_received_count, u.is_online, u.last_seen_at, u.last_login_at, u.created_at, u.updated_at`;

// Public columns for other users' profiles (excludes email, phone, terms_accepted_at)
const PUBLIC_USER_SELECT_COLUMNS = `u.id, u.username, u.display_name, u.avatar_url, u.bio, u.level, u.xp, u.xp_to_next_level, u.planet_style_id, u.comets_count, u.gifts_count, u.messages_sent_count, u.messages_received_count, u.is_online, u.last_seen_at, u.created_at`;

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const userRes = await query(
            `SELECT ${USER_SELECT_COLUMNS}, COALESCE(array_agg(t.tag) FILTER (WHERE t.tag IS NOT NULL), '{}') as tags
             FROM users u
             LEFT JOIN user_tags t ON u.id = t.user_id
             WHERE u.id = $1
             GROUP BY u.id`,
            [userId]
        );

        if (userRes.rows.length === 0) {
            return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
        }

        successResponse(res, userRes.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { displayName, bio, avatarUrl, phone, gender, country, planetStyleId } = req.body;

        const fields: string[] = [];
        const values: any[] = [];
        let n = 1;

        if (displayName !== undefined) { fields.push(`display_name = $${n++}`); values.push(displayName); }
        if (bio !== undefined)         { fields.push(`bio = $${n++}`);          values.push(bio); }
        if (avatarUrl !== undefined)   { fields.push(`avatar_url = $${n++}`);   values.push(avatarUrl); }
        if (phone !== undefined)       { fields.push(`phone = $${n++}`);        values.push(phone); }
        if (gender !== undefined)      { fields.push(`gender = $${n++}`);       values.push(gender); }
        if (country !== undefined)     { fields.push(`country = $${n++}`);      values.push(country); }
        if (planetStyleId !== undefined) { fields.push(`planet_style_id = $${n++}`); values.push(planetStyleId); }

        if (fields.length === 0) {
            return errorResponse(res, 400, 'VALIDATION_ERROR', 'No fields to update');
        }

        values.push(userId);
        await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${n}`, values);

        // Re-fetch with tags join so the response shape matches getMe
        const fullRes = await query(
            `SELECT ${USER_SELECT_COLUMNS}, COALESCE(array_agg(t.tag) FILTER (WHERE t.tag IS NOT NULL), '{}') as tags
             FROM users u LEFT JOIN user_tags t ON u.id = t.user_id
             WHERE u.id = $1 GROUP BY u.id`,
            [userId]
        );

        successResponse(res, fullRes.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const discoverUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const page = Math.max(1, parseInt(req.query.page as string || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '50')));
        const offset = (page - 1) * limit;

        const usersRes = await query(
            `SELECT ${PUBLIC_USER_SELECT_COLUMNS},
                    COALESCE(array_agg(t.tag) FILTER (WHERE t.tag IS NOT NULL), '{}') as tags
             FROM users u
             LEFT JOIN user_tags t ON u.id = t.user_id
             WHERE u.id != $1 AND u.is_banned = false AND u.is_onboarded = true
             GROUP BY u.id
             ORDER BY u.is_online DESC, u.last_seen_at DESC NULLS LAST, u.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        successResponse(res, { users: usersRes.rows, page, limit });
    } catch (error) {
        next(error);
    }
};

export const getUserByUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;

        const userRes = await query(
            `SELECT ${PUBLIC_USER_SELECT_COLUMNS},
                    COALESCE(array_agg(t.tag) FILTER (WHERE t.tag IS NOT NULL), '{}') as tags
             FROM users u
             LEFT JOIN user_tags t ON u.id = t.user_id
             WHERE LOWER(u.username) = LOWER($1) AND u.is_banned = false
             GROUP BY u.id`,
            [username]
        );

        if (userRes.rows.length === 0) {
            return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
        }

        successResponse(res, userRes.rows[0]);
    } catch (error) {
        next(error);
    }
};
