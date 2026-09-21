import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, MedioPago } from '../types';

export const getAllMediosPago = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM medios_pago WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY COALESCE(orden, 2147483647), nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener medios de pago', details: error.message });
  }
};

export const getMedioPagoById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM medios_pago WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Medio de pago no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener medio de pago', details: error.message });
  }
};

export const createMedioPago = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const descripcion = String(rawBody.descripcion ?? rawBody.description ?? '').trim() || null;
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;
    const ordenRaw = rawBody.orden ?? rawBody.order;
    const orden = ordenRaw === undefined || ordenRaw === null || ordenRaw === '' ? null : Number(ordenRaw);

    if (!nombre) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere un valor para nombre'
      });
      return;
    }

    if (orden !== null && isNaN(orden)) {
      res.status(400).json({
        error: 'El campo orden debe ser numérico',
        received: rawBody
      });
      return;
    }

    const result = await pool.query(
      'INSERT INTO medios_pago (nombre, descripcion, activo, orden) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, descripcion, activo, orden]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear medio de pago', details: error.message });
  }
};

export const updateMedioPago = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const descripcionRaw = rawBody.descripcion ?? rawBody.description ?? '';
    const descripcion = descripcionRaw === null || descripcionRaw === undefined ? null : String(descripcionRaw).trim() || null;
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );
    const ordenRaw = rawBody.orden ?? rawBody.order;
    const orden = ordenRaw === undefined || ordenRaw === null || ordenRaw === '' ? null : Number(ordenRaw);

    if (!nombre || activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren nombre y activo'
      });
      return;
    }

    if (orden !== null && isNaN(orden)) {
      res.status(400).json({
        error: 'El campo orden debe ser numérico',
        received: rawBody
      });
      return;
    }

    const result = await pool.query(
      'UPDATE medios_pago SET nombre = $1, descripcion = $2, activo = $3, orden = $4 WHERE id = $5 RETURNING *',
      [nombre, descripcion, activo, orden, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Medio de pago no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar medio de pago', details: error.message });
  }
};

export const deleteMedioPago = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM medios_pago WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Medio de pago no encontrado' });
      return;
    }

    res.json({ message: 'Medio de pago eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar medio de pago', details: error.message });
  }
};