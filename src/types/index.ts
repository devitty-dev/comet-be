export interface User {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    date_of_birth: Date;
    level: number;
    xp: number;
    xp_to_next_level: number;
    is_onboarded: boolean;
    is_banned: boolean;
    phone?: string;
    gender?: 'Male' | 'Female' | 'Other';
    country?: string;
    terms_accepted_at?: Date;
    planet_style_id: number;
    comets_count: number;
    gifts_count: number;
    messages_sent_count: number;
    messages_received_count: number;
    is_online: boolean;
    last_seen_at?: Date;
    last_login_at?: Date;
    created_at: Date;
    updated_at: Date;
    // password_hash is intentionally omitted — never returned to clients
}

export interface AuthProvider {
    id: string;
    user_id: string;
    provider: 'google' | 'apple' | 'email';
    provider_user_id: string;
    created_at: Date;
}

export interface RefreshToken {
    id: string;
    user_id: string;
    token_hash: string;
    device_info?: string;
    expires_at: Date;
    revoked_at?: Date;
    created_at: Date;
}

export interface UserTag {
    id: string;
    user_id: string;
    tag: string;
    created_at: Date;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
    isNewUser: boolean;
}
