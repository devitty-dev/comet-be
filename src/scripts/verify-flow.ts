import { AuthService } from '../services/auth.service';
import express from 'express';
import http from 'http';
import pool from '../config/db';

// Mock verifyGoogle (we need to do this carefully as AuthService is imported)
// A better way in a script like this is to extend the class or overwrite the method on the prototype
// after import but before usage.
// Since we are running this script directly, we can just modify the prototype.

// We need to import app usually, but app implementation imports routes -> controllers -> services.
// So modifying prototype *before* app starts handling requests is fine.

const originalVerifyGoogle = AuthService.prototype.verifyGoogle;
AuthService.prototype.verifyGoogle = async function (token: string) {
    console.log('Mock verifyGoogle called with:', token);
    if (token === 'valid_google_token') {
        // Return a mocked payload conforming to Google's TokenPayload
        return {
            sub: 'google_123456789',
            email: 'test_user@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
            iss: 'google',
            aud: 'client_id',
            iat: 123,
            exp: 456
        } as any;
    }
    throw new Error('Invalid token');
};

// Now import app
import app from '../app';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
    const server = http.createServer(app);

    try {
        // Start server
        await new Promise<void>((resolve) => {
            server.listen(PORT, () => {
                console.log(`Test server running on ${PORT}`);
                resolve();
            });
        });

        // 1. Test Health
        console.log('\n--- Test 1: Health Check ---');
        const healthRes = await fetch(`${BASE_URL}/health`);
        console.log(`Health Status: ${healthRes.status}`);

        // 2. Test Google Login (New User)
        console.log('\n--- Test 2: Google Login ---');
        const loginRes = await fetch(`${BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'valid_google_token' })
        });
        const loginData = await loginRes.json();
        console.log(`Login Status: ${loginRes.status}`);
        console.log(`Is New User: ${loginData.data?.isNewUser}`);

        if (!loginData.success) {
            console.error('Login failed:', loginData);
            throw new Error('Login failed');
        }
        const { accessToken, refreshToken, user } = loginData.data;

        // 3. Test Get Current User (Before Onboarding)
        console.log('\n--- Test 3: Get Current User (Before Onboarding) ---');
        const meRes1 = await fetch(`${BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData1 = await meRes1.json();
        console.log(`Me Status: ${meRes1.status}`);
        console.log(`Is Onboarded: ${meData1.data?.is_onboarded}`);

        // 4. Test Check Username
        console.log('\n--- Test 4: Check Username ---');
        const uniqueUsername = `user_${Date.now().toString().slice(-8)}`; // Max 20 chars: 5 + 8 = 13
        const checkRes = await fetch(`${BASE_URL}/onboarding/username/check?username=${uniqueUsername}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const checkData = await checkRes.json();
        console.log(`Username Available: ${JSON.stringify(checkData)}`);

        // 5. Test Set Username
        console.log('\n--- Test 5: Set Username ---');
        const setUserRes = await fetch(`${BASE_URL}/onboarding/username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ username: uniqueUsername })
        });
        console.log(`Set Username Status: ${setUserRes.status}`);
        const setUserData = await setUserRes.json();
        console.log(`Set Username Body: ${JSON.stringify(setUserData)}`);

        // 6. Test Profile Update
        console.log('\n--- Test 6: Update Profile ---');
        const profileRes = await fetch(`${BASE_URL}/onboarding/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                displayName: 'Test User Updated',
                dateOfBirth: '2000-01-01',
                avatarUrl: 'https://example.com/new_avatar.jpg'
            })
        });
        console.log(`Profile Status: ${profileRes.status}`);

        // 7. Test Set Tags
        console.log('\n--- Test 7: Set Tags ---');
        const tagsRes = await fetch(`${BASE_URL}/onboarding/tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ tags: ['comedy', 'tech'] })
        });
        console.log(`Set Tags Status: ${tagsRes.status}`);

        // 8. Test Complete Onboarding
        console.log('\n--- Test 8: Complete Onboarding ---');
        const completeRes = await fetch(`${BASE_URL}/onboarding/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log(`Complete Status: ${completeRes.status}`);
        console.log(`Complete Body: ${JSON.stringify(await completeRes.json())}`);

        // 9. Test Get Current User (After Onboarding)
        console.log('\n--- Test 9: Get Current User (After Onboarding) ---');
        const meRes2 = await fetch(`${BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData2 = await meRes2.json();
        console.log(`Me Status: ${meRes2.status}`);
        console.log(`Is Onboarded: ${meData2.data?.is_onboarded}`);
        console.log(`Tags: ${JSON.stringify(meData2.data?.tags)}`);

        // 10. Test Refresh Token
        console.log('\n--- Test 10: Refresh Token ---');
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const refreshText = await refreshRes.text();
        let refreshData;
        try {
            refreshData = JSON.parse(refreshText);
            console.log(`Refresh Status: ${refreshRes.status}`);
            console.log(`New Access Token: ${!!refreshData.data?.accessToken}`);
        } catch (e) {
            console.error('Refresh Token Response (Not JSON):', refreshText);
            throw e;
        }

        // 11. Test Logout
        console.log('\n--- Test 11: Logout ---');
        const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ refreshToken: refreshData?.data?.refreshToken || refreshToken })
        });
        console.log(`Logout Status: ${logoutRes.status}`);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        // Cleanup
        server.close();

        // Clean DB (optional)
        try {
            const client = await pool.connect();
            // await client.query("DELETE FROM users WHERE email = 'test_user@example.com'");
            client.release();
            await pool.end();
        } catch (e) { console.error(e); }

        console.log('Tests completed.');
        process.exit(0);
    }
}

// Mock fetch if strictly needed (node 18+ has it)
// if (!global.fetch) { ... }

runTests();
