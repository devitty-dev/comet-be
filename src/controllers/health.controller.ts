import { Request, Response } from 'express';
import pool from '../config/db';

export const getHealth = async (req: Request, res: Response) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: 'error',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: 'disconnected',
        });
    }
};
