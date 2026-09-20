import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Cliente } from '../types';

export const getAllClientes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM clientes WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY apellido, nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener clientes', details: error.message });
  }
};

export const getClienteById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener cliente', details: error.message });
  }
};

export const createCliente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const apellido = String(rawBody.apellido ?? rawBody.lastName ?? rawBody.last_name ?? '').trim();
    const documento = String(rawBody.documento ?? rawBody.doc ?? rawBody.dni ?? '').trim() || null;
    const telefono = String(rawBody.telefono ?? rawBody.phone ?? rawBody.phone_number ?? '').trim() || null;
    const email = String(rawBody.email ?? '').trim() || null;
    const direccion = String(rawBody.direccion ?? rawBody.address ?? '').trim() || null;
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (!nombre || !apellido) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren nombre y apellido',
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO clientes (nombre, apellido, documento, telefono, email, direccion, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, apellido, documento, telefono, email, direccion, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear cliente', details: error.message });
  }
};

export const updateCliente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const apellido = String(rawBody.apellido ?? rawBody.lastName ?? rawBody.last_name ?? '').trim();
    const documento = rawBody.documento === undefined ? undefined : (String(rawBody.documento ?? '').trim() || null);
    const telefono = rawBody.telefono === undefined ? undefined : (String(rawBody.telefono ?? '').trim() || null);
    const email = rawBody.email === undefined ? undefined : (String(rawBody.email ?? '').trim() || null);
    const direccion = rawBody.direccion === undefined ? undefined : (String(rawBody.direccion ?? '').trim() || null);
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (!nombre || !apellido || activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren nombre, apellido y activo',
      });
      return;
    }

    const result = await pool.query(
      `UPDATE clientes SET nombre = $1, apellido = $2, documento = $3, telefono = $4, email = $5,
       direccion = $6, activo = $7, updated_at = NOW() WHERE id = $8 RETURNING *`,
      [nombre, apellido, documento, telefono, email, direccion, activo, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar cliente', details: error.message });
  }
};

export const deleteCliente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar cliente', details: error.message });
  }
};