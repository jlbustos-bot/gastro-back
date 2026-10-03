import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Grupo2Prod } from '../types';

export const getAllGrupo2Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM grupo2prod WHERE 1=1';
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

export const getGrupo2ProdById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM grupo2prod WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener producto', details: error.message });
  }
};

export const createGrupo2Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (!nombre) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere un valor para nombre',
      });
      return;
    }

    const result = await pool.query(
      'INSERT INTO grupo2prod (nombre, activo) VALUES ($1, $2) RETURNING *',
      [nombre, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear producto', details: error.message });
  }
};

export const updateGrupo2Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (!nombre || activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren nombre y activo',
      });
      return;
    }

    const result = await pool.query(
      'UPDATE grupo2prod SET nombre = $1, activo = $2 WHERE id = $3 RETURNING *',
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

export const deleteGrupo2Prod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM grupo2prod WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar producto', details: error.message });
  }
};
