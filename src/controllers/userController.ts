import { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { AuthRequest, User } from '../types';

const VALID_ROLES = ['admin', 'manager', 'chef', 'waiter'];

const isRoleValid = (role: string): boolean => VALID_ROLES.includes(role);

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    const roleValue = Array.isArray(role) ? role[0] : role;
    let query = 'SELECT id, username, email, role, created_at, updated_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (roleValue !== undefined && roleValue !== '') {
      query += ' AND role = $' + (params.length + 1);
      params.push(roleValue);
    }

    query += ' ORDER BY username';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener usuario', details: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const username = String(rawBody.username ?? '').trim();
    const email = String(rawBody.email ?? '').trim();
    const password = String(rawBody.password ?? '');
    const role = String(rawBody.role ?? rawBody.rol ?? 'waiter').trim();

    if (!username || !email || !password) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren username, email y password',
      });
      return;
    }

    if (!isRoleValid(role)) {
      res.status(400).json({
        error: 'Rol inválido',
        received: rawBody,
        detalle: `Roles válidos: ${VALID_ROLES.join(', ')}`,
      });
      return;
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'El nombre de usuario o email ya existe' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at, updated_at',
      [username, email, hashedPassword, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear usuario', details: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const username = rawBody.username === undefined ? undefined : String(rawBody.username ?? '').trim();
    const email = rawBody.email === undefined ? undefined : String(rawBody.email ?? '').trim();
    const role = rawBody.role === undefined ? undefined : String(rawBody.role ?? '').trim();
    const password = rawBody.password === undefined || rawBody.password === '' ? undefined : String(rawBody.password);

    if (username === undefined && email === undefined && role === undefined && password === undefined) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    if (role !== undefined && !isRoleValid(role)) {
      res.status(400).json({
        error: 'Rol inválido',
        received: rawBody,
        detalle: `Roles válidos: ${VALID_ROLES.join(', ')}`,
      });
      return;
    }

    const currentResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const current = currentResult.rows[0];
    const newUsername = username !== undefined ? username : current.username;
    const newEmail = email !== undefined ? email : current.email;

    const duplicateCheck = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id <> $3',
      [newUsername, newEmail, id]
    );
    if (duplicateCheck.rows.length > 0) {
      res.status(400).json({ error: 'El nombre de usuario o email ya existe' });
      return;
    }

    let hashedPassword: string | undefined;
    if (password !== undefined) {
      hashedPassword = await hashPassword(password);
    }

    const result = await pool.query(
      `UPDATE users SET username = $1, email = $2, role = $3, ${hashedPassword !== undefined ? 'password = $4, ' : ''}updated_at = NOW() WHERE id = ${hashedPassword !== undefined ? '$5' : '$4'} RETURNING id, username, email, role, created_at, updated_at`,
      hashedPassword !== undefined
        ? [newUsername, newEmail, role !== undefined ? role : current.role, hashedPassword, id]
        : [newUsername, newEmail, role !== undefined ? role : current.role, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar usuario', details: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user && Number(id) === req.user.id) {
      res.status(400).json({ error: 'No puede eliminar su propio usuario' });
      return;
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
  }
};