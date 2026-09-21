import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getAllProveedores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM proveedores WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener proveedores', details: error.message });
  }
};

export const getProveedorById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM proveedores WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener proveedor', details: error.message });
  }
};

export const createProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const toText = (value: unknown): string | null => {
      if (value === undefined || value === null) {
        return null;
      }
      const text = String(value).trim();
      return text || null;
    };
    const cuit = toText(rawBody.cuit);
    const telefono = toText(rawBody.telefono ?? rawBody.phone);
    const email = toText(rawBody.email);
    const direccion = toText(rawBody.direccion ?? rawBody.address);
    const observaciones = toText(rawBody.observaciones ?? rawBody.observations);
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (!nombre) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere un valor para nombre'
      });
      return;
    }

    const result = await pool.query(
      'INSERT INTO proveedores (nombre, cuit, telefono, email, direccion, observaciones, activo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nombre, cuit, telefono, email, direccion, observaciones, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear proveedor', details: error.message });
  }
};

export const updateProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const toText = (value: unknown): string | null => {
      if (value === undefined || value === null) {
        return null;
      }
      const text = String(value).trim();
      return text || null;
    };
    const cuit = toText(rawBody.cuit);
    const telefono = toText(rawBody.telefono ?? rawBody.phone);
    const email = toText(rawBody.email);
    const direccion = toText(rawBody.direccion ?? rawBody.address);
    const observaciones = toText(rawBody.observaciones ?? rawBody.observations);
    const activoRaw = rawBody.activo ?? rawBody.active;
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (!nombre) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere un valor para nombre'
      });
      return;
    }

    if (activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere un valor para activo'
      });
      return;
    }

    const result = await pool.query(
      'UPDATE proveedores SET nombre = $1, cuit = $2, telefono = $3, email = $4, direccion = $5, observaciones = $6, activo = $7, updated_at = NOW() WHERE id = $8 RETURNING *',
      [nombre, cuit, telefono, email, direccion, observaciones, activo, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar proveedor', details: error.message });
  }
};

export const deleteProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM proveedores WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    res.json({ message: 'Proveedor eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar proveedor', details: error.message });
  }
};