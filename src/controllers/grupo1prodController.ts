import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Grupo1Prod } from '../types';

export const getAllGrupo1Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM grupo1prod WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
};

export const getGrupo1ProdById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM grupo1prod WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener producto', details: error.message });
  }
};

export const createGrupo1Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre, activo }: Grupo1Prod = req.body;

    if (!nombre) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO grupo1prod (nombre, activo) VALUES ($1, $2) RETURNING *',
      [nombre, activo ?? true]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear producto', details: error.message });
  }
};

export const updateGrupo1Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, activo }: Partial<Grupo1Prod> = req.body;

    const result = await pool.query(
      'UPDATE grupo1prod SET nombre = COALESCE($1, nombre), activo = COALESCE($2, activo) WHERE id = $3 RETURNING *',
      [nombre, activo, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar producto', details: error.message });
  }
};

export const deleteGrupo1Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM grupo1prod WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar producto', details: error.message });
  }
};
