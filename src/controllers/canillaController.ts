import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getAllCanillas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = `
      SELECT c.id, c.nombre, c.producto_id, c.activo, c.created_at, c.updated_at,
             p.nombre AS producto_nombre,
             p.precioventa AS producto_precioventa,
             p.nombrecorto AS producto_nombrecorto
      FROM canillas c
      LEFT JOIN productos p ON p.id = c.producto_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND c.activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY c.id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener canillas', details: error.message });
  }
};

export const getCanillaById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.id, c.nombre, c.producto_id, c.activo, c.created_at, c.updated_at,
              p.nombre AS producto_nombre,
              p.precioventa AS producto_precioventa,
              p.nombrecorto AS producto_nombrecorto
       FROM canillas c
       LEFT JOIN productos p ON p.id = c.producto_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Canilla no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener canilla', details: error.message });
  }
};

export const createCanilla = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? '').trim();
    const producto_id_raw = rawBody.producto_id ?? rawBody.productoId ?? undefined;
    const producto_id = producto_id_raw === undefined || producto_id_raw === null || producto_id_raw === '' ? null : Number(producto_id_raw);
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (!nombre) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere el nombre de la canilla',
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO canillas (nombre, producto_id, activo)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, producto_id, activo, created_at, updated_at`,
      [nombre, producto_id, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear canilla', details: error.message });
  }
};

export const updateCanilla = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const nombre = rawBody.nombre === undefined ? undefined : String(rawBody.nombre ?? '').trim();
    const productoValue = rawBody.producto_id !== undefined ? rawBody.producto_id : rawBody.productoId;
    const hasProducto = productoValue !== undefined;
    const producto_id = !hasProducto
      ? undefined
      : (productoValue === null || productoValue === '' ? null : Number(productoValue));
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (nombre === undefined && !hasProducto && activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (nombre !== undefined) {
      params.push(nombre);
      updatable.push(`nombre = $${params.length}`);
    }

    if (producto_id !== undefined) {
      params.push(producto_id);
      updatable.push(`producto_id = $${params.length}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updatable.push(`activo = $${params.length}`);
    }

    updatable.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE canillas SET ${updatable.join(', ')} WHERE id = $${params.length}
       RETURNING id, nombre, producto_id, activo, created_at, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Canilla no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar canilla', details: error.message });
  }
};

export const deleteCanilla = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM canillas WHERE id = $1 RETURNING id, nombre', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Canilla no encontrada' });
      return;
    }

    res.json({ message: 'Canilla eliminada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar canilla', details: error.message });
  }
};