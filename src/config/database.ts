import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gastro',
  user: process.env.DB_USER || 'operador',
  password: process.env.DB_PASSWORD || 'operador',
});

pool.on('error', (err) => {
  console.error('Error en pool de conexión:', err);
});

export default pool;
