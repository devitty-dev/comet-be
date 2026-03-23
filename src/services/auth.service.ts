import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import pool, { query } from '../config/db';
import { User, AuthTokens } from '../types';
import { generateAccessToken, generateRefreshTokenString } from '../utils/jwt';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { ConflictError, AuthenticationError, AuthorizationError } from '../utils/errors';

const USER_SELECT_COLUMNS = `id, email, username, display_name, avatar_url, bio, date_of_birth, level, xp, xp_to_next_level, is_onboarded, phone, gender, country, planet_style_id, comets_count, gifts_count, messages_sent_count, messages_received_count, is_online, last_seen_at, last_login_at, created_at, updated_at`;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
    // Verify Google Token
    async verifyGoogle(idToken: string) {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    }

    // Verify Apple Token
    async verifyApple(identityToken: string) {
        try {
            const { sub: userAppleId, email } = await appleSignin.verifyIdToken(identityToken, {
                audience: process.env.APPLE_BUNDLE_ID,
            });
            return { sub: userAppleId, email };
        } catch (err) {
            console.error(err);
            throw new Error('Invalid Apple Identity Token');
        }
    }

    // Find or Create User (wrapped in transaction)
    async findOrCreateUser(
        provider: 'google' | 'apple',
        providerUserId: string,
        email: string,
        displayName: string,
        avatarUrl?: string
    ): Promise<{ user: User; isNewUser: boolean }> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Check if auth_provider exists
            const providerRes = await client.query(
                'SELECT user_id FROM auth_providers WHERE provider = $1 AND provider_user_id = $2',
                [provider, providerUserId]
            );

            if (providerRes.rows.length > 0) {
                const userId = providerRes.rows[0].user_id;

                // Update last login and return fresh data
                const userRes = await client.query(
                    `UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING ${USER_SELECT_COLUMNS}`,
                    [userId]
                );

                await client.query('COMMIT');
                return { user: userRes.rows[0], isNewUser: false };
            }

            // 2. Check if user with email exists (to link provider)
            let userId: string;
            let isNewUser = false;

            const emailRes = await client.query(
                'SELECT id FROM users WHERE email = $1 FOR UPDATE',
                [email]
            );

            if (emailRes.rows.length > 0) {
                userId = emailRes.rows[0].id;

                // Update last login
                await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
            } else {
                // Create new user
                isNewUser = true;
                const tempUsername = `user_${randomUUID().substring(0, 8)}`;
                const planetStyleId = Math.floor(Math.random() * 7) + 1;

                const insertUserRes = await client.query(
                    `INSERT INTO users (email, username, display_name, avatar_url, date_of_birth, planet_style_id, is_onboarded)
                     VALUES ($1, $2, $3, $4, '1900-01-01', $5, TRUE) RETURNING id`,
                    [email, tempUsername, displayName, avatarUrl, planetStyleId]
                );
                userId = insertUserRes.rows[0].id;
            }

            // Create auth_provider link
            await client.query(
                `INSERT INTO auth_providers (user_id, provider, provider_user_id)
                 VALUES ($1, $2, $3)`,
                [userId, provider, providerUserId]
            );

            const userRes = await client.query(
                `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE id = $1`,
                [userId]
            );

            await client.query('COMMIT');
            return { user: userRes.rows[0], isNewUser };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Generate Tokens
    async generateTokens(userId: string, deviceInfo?: string): Promise<AuthTokens> {
        const accessToken = generateAccessToken(userId);
        const refreshTokenString = generateRefreshTokenString();

        // Hash refresh token
        const salt = await bcrypt.genSalt(10);
        const tokenHash = await bcrypt.hash(refreshTokenString, salt);

        // Store in DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        const insertRes = await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, tokenHash, deviceInfo, expiresAt]
        );

        return { accessToken, refreshToken: `${insertRes.rows[0].id}.${refreshTokenString}` };
    }

    // Refresh Token
    async refreshToken(token: string): Promise<AuthTokens> {
        const [tokenId, tokenSecret] = token.split('.');
        if (!tokenId || !tokenSecret) throw new Error('Invalid token format');

        const res = await query('SELECT * FROM refresh_tokens WHERE id = $1', [tokenId]);
        if (res.rows.length === 0) throw new Error('Invalid token');

        const tokenRecord = res.rows[0];

        // Check revocation
        if (tokenRecord.revoked_at) {
            // Security: Revoke all tokens for this user (Token Reuse Detection)
            await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [tokenRecord.user_id]);
            throw new Error('Token reused');
        }

        // Check expiry
        if (new Date() > new Date(tokenRecord.expires_at)) {
            throw new Error('Token expired');
        }

        // Verify hash
        const isValid = await bcrypt.compare(tokenSecret, tokenRecord.token_hash);
        if (!isValid) throw new Error('Invalid token');

        // Rotate: Revoke old, issue new
        await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [tokenId]);

        const newSecret = generateRefreshTokenString();
        const newHash = await bcrypt.hash(newSecret, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const insertRes = await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [tokenRecord.user_id, newHash, tokenRecord.device_info, expiresAt]
        );

        const newAccessToken = generateAccessToken(tokenRecord.user_id);
        return {
            accessToken: newAccessToken,
            refreshToken: `${insertRes.rows[0].id}.${newSecret}`
        };
    }

    // Email Registration
    async registerEmail(
        email: string,
        password: string,
        displayName: string,
        age: number,
        phone?: string,
        gender?: string,
        country?: string
    ): Promise<{ user: User; isNewUser: true }> {
        // Check if email already in use
        const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            throw new ConflictError('Email already in use');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const tempUsername = `user_${randomUUID().substring(0, 8)}`;
        const planetStyleId = Math.floor(Math.random() * 7) + 1;

        // Convert age to approximate date of birth (June 15 mid-year to minimise off-by-one errors)
        const birthYear = new Date().getFullYear() - age;
        const dob = new Date(birthYear, 5, 15); // month is 0-indexed

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertRes = await client.query(
                `INSERT INTO users
                    (email, username, display_name, password_hash, date_of_birth, phone, gender, country,
                     terms_accepted_at, planet_style_id, is_onboarded)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, TRUE)
                 RETURNING id`,
                [email, tempUsername, displayName, passwordHash, dob, phone || null, gender || null, country || null, planetStyleId]
            );
            const userId = insertRes.rows[0].id;

            await client.query(
                `INSERT INTO auth_providers (user_id, provider, provider_user_id) VALUES ($1, 'email', $2)`,
                [userId, email]
            );

            const userRes = await client.query(
                `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE id = $1`,
                [userId]
            );

            await client.query('COMMIT');
            return { user: userRes.rows[0], isNewUser: true };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Email Login
    async loginEmail(email: string, password: string): Promise<{ user: User; isNewUser: false }> {
        // Fetch with password_hash (only query that needs it)
        const res = await query('SELECT id, password_hash, is_banned FROM users WHERE email = $1', [email]);

        // Use same error for missing user and wrong password to avoid email enumeration
        if (res.rows.length === 0 || !res.rows[0].password_hash) {
            throw new AuthenticationError('Invalid email or password');
        }

        const record = res.rows[0];
        const isValid = await bcrypt.compare(password, record.password_hash);
        if (!isValid) throw new AuthenticationError('Invalid email or password');

        if (record.is_banned) throw new AuthorizationError('Account suspended');

        await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [record.id]);

        const userRes = await query(`SELECT ${USER_SELECT_COLUMNS} FROM users WHERE id = $1`, [record.id]);
        return { user: userRes.rows[0], isNewUser: false };
    }

    // Revoke (Logout) - requires userId to verify ownership
    async revokeToken(token: string, userId: string) {
        const [tokenId] = token.split('.');
        if (tokenId) {
            await query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2',
                [tokenId, userId]
            );
        }
    }
}
