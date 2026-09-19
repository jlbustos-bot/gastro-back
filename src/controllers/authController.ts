import { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { generateToken } from '../middleware/auth';
import { AuthRequest, User } from '../types';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, role = 'waiter' } = req.body;

    // Validaciones
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'Usuario o email ya existe' });
      return;
    }

    // Guardar la contraseña en texto plano
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, password, role]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.username, user.role);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      token,
    });
  } catch (error: any) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario', details: error.message });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña requeridos' });
      return;
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const user = result.rows[0];
    const isPlainPasswordMatch = user.password === password;
    const isLegacyHashMatch = !isPlainPasswordMatch && await bcrypt.compare(password, user.password).catch(() => false);

    if (!isPlainPasswordMatch && !isLegacyHashMatch) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = generateToken(user.id, user.username, user.role);

    res.json({
      message: 'Login exitoso',
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token,
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión', details: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const result = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener perfil', details: error.message });
  }
};
