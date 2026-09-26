import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getAllCondicionesCtaCte = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM condicion_cta_cte WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener condiciones de cuenta corriente', details: error.message });
  }
};

export const getCondicionCtaCteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM condicion_cta_cte WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Condición no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener condición', details: error.message });
  }
};

export const createCondicionCtaCte = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const descripcion = String(rawBody.descripcion ?? '').trim();
    const cantidadDiasRaw = rawBody.cantidad_dias ?? rawBody.cantidadDias ?? 0;
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (!descripcion) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere la descripción',
      });
      return;
    }

    const cantidad_dias = Math.round(Number(cantidadDiasRaw || 0));

    const result = await pool.query(
      'INSERT INTO condicion_cta_cte (descripcion, cantidad_dias, activo) VALUES ($1, $2, $3) RETURNING *',
      [descripcion, cantidad_dias, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear condición', details: error.message });
  }
};

export const updateCondicionCtaCte = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const descripcion = rawBody.descripcion === undefined ? undefined : String(rawBody.descripcion ?? '').trim();
    const cantidadDiasRaw = rawBody.cantidad_dias ?? rawBody.cantidadDias ?? undefined;
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const cantidad_dias = cantidadDiasRaw === undefined ? undefined : Math.round(Number(cantidadDiasRaw || 0));
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (descripcion === undefined && cantidad_dias === undefined && activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (descripcion !== undefined) {
      params.push(descripcion);
      updatable.push(`descripcion = $${params.length}`);
    }

    if (cantidad_dias !== undefined) {
      params.push(cantidad_dias);
      updatable.push(`cantidad_dias = $${params.length}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updatable.push(`activo = $${params.length}`);
    }

    updatable.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE condicion_cta_cte SET ${updatable.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Condición no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar condición', details: error.message });
  }
};

export const deleteCondicionCtaCte = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM condicion_cta_cte WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Condición no encontrada' });
      return;
    }

    res.json({ message: 'Condición eliminada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar condición', details: error.message });
  }
};