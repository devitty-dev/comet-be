import pool, { query } from '../config/db';
import { User } from '../types';
import { ConflictError, ValidationError } from '../utils/errors';

const RESERVED_WORDS = ['admin', 'comet', 'support', 'null', 'undefined', 'moderator', 'system'];
const TEMP_USERNAME_PATTERN = /^user_[a-f0-9]{8}$/;

const USER_SELECT_COLUMNS = `id, email, username, display_name, avatar_url, bio, date_of_birth, level, xp, xp_to_next_level, is_onboarded, phone, gender, country, planet_style_id, comets_count, gifts_count, messages_sent_count, messages_received_count, is_online, last_seen_at, last_login_at, created_at, updated_at`;

export const AVAILABLE_TAGS = [
    { id: 'comedy', label: 'Comedy', emoji: '😂' },
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'sports', label: 'Sports', emoji: '🏀' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮' },
    { id: 'cooking', label: 'Cooking', emoji: '🍳' },
    { id: 'travel', label: 'Travel', emoji: '✈️' },
    { id: 'fashion', label: 'Fashion', emoji: '👗' },
    { id: 'art', label: 'Art', emoji: '🎨' },
    { id: 'tech', label: 'Tech', emoji: '💻' },
    { id: 'fitness', label: 'Fitness', emoji: '💪' },
    { id: 'animals', label: 'Animals', emoji: '🐶' },
    { id: 'nature', label: 'Nature', emoji: '🌿' },
    { id: 'dance', label: 'Dance', emoji: '💃' },
    { id: 'education', label: 'Education', emoji: '📚' },
    { id: 'diy', label: 'DIY', emoji: '🔨' },
];

export class OnboardingService {
    async isUsernameAvailable(username: string): Promise<boolean> {
        if (RESERVED_WORDS.includes(username.toLowerCase())) return false;

        // Case-insensitive check
        const res = await query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        return res.rows.length === 0;
    }

    async setUsername(userId: string, username: string): Promise<string> {
        if (RESERVED_WORDS.includes(username.toLowerCase())) {
            throw new ConflictError('Username taken or reserved');
        }

        try {
            await query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
            return username;
        } catch (err: any) {
            // Handle PostgreSQL unique constraint violation
            if (err.code === '23505') {
                throw new ConflictError('Username taken or reserved');
            }
            throw err;
        }
    }

    async updateProfile(userId: string, displayName: string, dateOfBirth: string, avatarUrl?: string): Promise<User> {
        const dob = new Date(dateOfBirth);

        // Validate date is a real date
        if (isNaN(dob.getTime())) {
            throw new ValidationError('Invalid date of birth');
        }

        const today = new Date();

        // Reject future dates
        if (dob > today) {
            throw new ValidationError('Date of birth cannot be in the future');
        }

        // Age check
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (age < 13) {
            throw new ValidationError('User must be at least 13 years old');
        }

        if (age > 120) {
            throw new ValidationError('Invalid date of birth');
        }

        const res = await query(
            `UPDATE users
             SET display_name = $1, date_of_birth = $2, avatar_url = COALESCE($3, avatar_url)
             WHERE id = $4
             RETURNING ${USER_SELECT_COLUMNS}`,
            [displayName, dateOfBirth, avatarUrl, userId]
        );

        return res.rows[0];
    }

    async setTags(userId: string, tags: string[]): Promise<string[]> {
        const allowedTagIds = AVAILABLE_TAGS.map(t => t.id);
        const invalidTags = tags.filter(t => !allowedTagIds.includes(t));

        if (invalidTags.length > 0) {
            throw new ValidationError(`Invalid tags: ${invalidTags.join(', ')}`);
        }

        if (tags.length === 0) throw new ValidationError('At least 1 tag required');
        if (tags.length > 10) throw new ValidationError('Maximum 10 tags allowed');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM user_tags WHERE user_id = $1', [userId]);

            for (const tag of tags) {
                await client.query(
                    'INSERT INTO user_tags (user_id, tag) VALUES ($1, $2)',
                    [userId, tag]
                );
            }

            await client.query('COMMIT');
            return tags;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async completeOnboarding(userId: string): Promise<User> {
        const userRes = await query(`SELECT ${USER_SELECT_COLUMNS} FROM users WHERE id = $1`, [userId]);
        const user = userRes.rows[0];

        const tagsRes = await query('SELECT 1 FROM user_tags WHERE user_id = $1', [userId]);

        // Check that username has been explicitly set (not temp placeholder)
        if (!user.username || TEMP_USERNAME_PATTERN.test(user.username)) {
            throw new ValidationError('Username required');
        }
        if (!user.display_name) throw new ValidationError('Display name required');

        // Check for dummy date (1900-01-01)
        const dob = new Date(user.date_of_birth);
        if (dob.getFullYear() === 1900) throw new ValidationError('Date of birth required');

        if (tagsRes.rowCount === 0) throw new ValidationError('At least 1 tag required');

        const res = await query(
            `UPDATE users SET is_onboarded = TRUE WHERE id = $1 RETURNING ${USER_SELECT_COLUMNS}`,
            [userId]
        );
        return res.rows[0];
    }

    getAvailableTags() {
        return AVAILABLE_TAGS;
    }
}
