import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Restaurant } from '../types';

export const getAllRestaurants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM restaurants ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener restaurantes', details: error.message });
  }
};

export const getRestaurantById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Restaurante no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener restaurante', details: error.message });
  }
};

export const createRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, address, phone, email } = req.body;

    if (!name || !address || !phone || !email) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO restaurants (name, description, address, phone, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, address, phone, email]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear restaurante', details: error.message });
  }
};

export const updateRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, address, phone, email } = req.body;

    const result = await pool.query(
      'UPDATE restaurants SET name = COALESCE($1, name), description = COALESCE($2, description), address = COALESCE($3, address), phone = COALESCE($4, phone), email = COALESCE($5, email) WHERE id = $6 RETURNING *',
      [name, description, address, phone, email, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Restaurante no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar restaurante', details: error.message });
  }
};

export const deleteRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM restaurants WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Restaurante no encontrado' });
      return;
    }

    res.json({ message: 'Restaurante eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar restaurante', details: error.message });
  }
};
