import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Mesa } from '../types';

export const getAllMesas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo, estado } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    const estadoValue = Array.isArray(estado) ? estado[0] : estado;
    let query = 'SELECT * FROM mesas WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    if (estadoValue !== undefined) {
      query += ' AND estado = $' + (params.length + 1);
      params.push(String(estadoValue));
    }

    query += ' ORDER BY numero';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener mesas', details: error.message });
  }
};

export const getMesaById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM mesas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Mesa no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener mesa', details: error.message });
  }
};

export const createMesa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const numero = Number(rawBody.numero ?? rawBody.tableNumber ?? rawBody.table_number);
    const capacidad = Number(rawBody.capacidad ?? rawBody.capacity ?? 1);
    const ubicacion = String(rawBody.ubicacion ?? rawBody.location ?? rawBody.ubication ?? '').trim() || null;
    const estado = String(rawBody.estado ?? rawBody.status ?? 'libre').trim() || 'libre';
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (isNaN(numero) || numero <= 0) {
      res.status(400).json({ error: 'El número de mesa es obligatorio y debe ser un entero positivo' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO mesas (numero, capacidad, ubicacion, estado, activo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [numero, capacidad, ubicacion, estado, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear mesa', details: error.message });
  }
};

export const updateMesa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};

    const currentResult = await pool.query('SELECT * FROM mesas WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'Mesa no encontrada' });
      return;
    }
    const current = currentResult.rows[0];

    const numeroRaw = rawBody.numero ?? rawBody.tableNumber ?? rawBody.table_number;
    const numero = numeroRaw === undefined || numeroRaw === null || numeroRaw === '' ? current.numero : Number(numeroRaw);
    const capacidadRaw = rawBody.capacidad ?? rawBody.capacity;
    const capacidad = capacidadRaw === undefined || capacidadRaw === null || capacidadRaw === '' ? current.capacidad : Number(capacidadRaw);
    const ubicacionRaw = rawBody.ubicacion ?? rawBody.location ?? rawBody.ubication;
    const ubicacion = ubicacionRaw === undefined || ubicacionRaw === null ? current.ubicacion : (String(ubicacionRaw).trim() || null);
    const estadoRaw = rawBody.estado ?? rawBody.status;
    const estado = estadoRaw === undefined || estadoRaw === null || estadoRaw === '' ? current.estado : String(estadoRaw).trim();
    const activoRaw = rawBody.activo ?? rawBody.active;
    const activo = activoRaw === undefined
      ? current.activo
      : !(activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false);

    if (isNaN(numero) || numero <= 0) {
      res.status(400).json({ error: 'El número de mesa debe ser un entero positivo' });
      return;
    }

    const result = await pool.query(
      'UPDATE mesas SET numero = $1, capacidad = $2, ubicacion = $3, estado = $4, activo = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
      [numero, capacidad, ubicacion, estado, activo, id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar mesa', details: error.message });
  }
};

export const deleteMesa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM mesas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Mesa no encontrada' });
      return;
    }

    res.json({ message: 'Mesa eliminada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar mesa', details: error.message });
  }
};