import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(process.env.DB_SSL === 'true' ? {
        ssl: {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        },
    } : {}),
});

async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('Running migrations...');

        // Create migrations tracking table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get already applied migrations
        const appliedRes = await client.query('SELECT filename FROM migrations ORDER BY filename');
        const appliedMigrations = new Set(appliedRes.rows.map(r => r.filename));

        // Read migration files
        const migrationDir = path.join(__dirname, '../db/migrations');
        const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            if (appliedMigrations.has(file)) {
                console.log(`Skipping already applied: ${file}`);
                continue;
            }

            console.log(`Executing migration: ${file}`);
            const filePath = path.join(migrationDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`Applied migration: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        console.log('All migrations executed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
