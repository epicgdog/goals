import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '../.env' });

// PostgreSQL connection pool
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'goals_tracker',
    user: process.env.DB_USER || 'goals_user',
    password: process.env.DB_PASSWORD || 'goals_password',
});

// Test connection
pool.query('SELECT NOW()')
    .then(() => console.log('✅ PostgreSQL connected'))
    .catch((err) => console.error('❌ PostgreSQL connection error:', err.message));

export default pool;
