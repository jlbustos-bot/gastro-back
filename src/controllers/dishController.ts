import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Dish } from '../types';

export const getAllDishes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { menu_id, category } = req.query;
    let query = 'SELECT * FROM dishes WHERE 1=1';
    const params: any[] = [];

    if (menu_id) {
      query += ' AND menu_id = $' + (params.length + 1);
      params.push(menu_id);
    }

    if (category) {
      query += ' AND category = $' + (params.length + 1);
      params.push(category);
    }

    query += ' ORDER BY category, name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener platos', details: error.message });
  }
};

export const getDishById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM dishes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener plato', details: error.message });
  }
};

export const createDish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { menu_id, name, description, price, category, preparation_time } = req.body;

    if (!menu_id || !name || !price || !category) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO dishes (menu_id, name, description, price, category, available, preparation_time) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [menu_id, name, description, price, category, true, preparation_time || 15]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear plato', details: error.message });
  }
};

export const updateDish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, price, category, available, preparation_time } = req.body;

    const result = await pool.query(
      'UPDATE dishes SET name = COALESCE($1, name), description = COALESCE($2, description), price = COALESCE($3, price), category = COALESCE($4, category), available = COALESCE($5, available), preparation_time = COALESCE($6, preparation_time) WHERE id = $7 RETURNING *',
      [name, description, price, category, available, preparation_time, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar plato', details: error.message });
  }
};

export const deleteDish = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM dishes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Plato no encontrado' });
      return;
    }

    res.json({ message: 'Plato eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar plato', details: error.message });
  }
};
