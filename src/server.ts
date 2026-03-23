import dotenv from 'dotenv';
dotenv.config(); // Must be called before any other imports that use env vars

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

import app from './app';
import pool from './config/db';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('HTTP server closed');
    });
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
