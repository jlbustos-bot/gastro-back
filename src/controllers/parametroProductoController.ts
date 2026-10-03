import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getAllParametrosProductos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM parametros_productos WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener parámetros de productos', details: error.message });
  }
};

export const getParametroProductoById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM parametros_productos WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetro de producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener parámetro de producto', details: error.message });
  }
};

export const createParametroProducto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const cantidadBarrilRaw = rawBody.cantidad_barril_cerveza ?? rawBody.cantidadBarrilCerveza ?? rawBody.cantidad_barril ?? 0;
    const coeficienteRaw = rawBody.coeficiente_precio_venta ?? rawBody.coeficientePrecioVenta ?? rawBody.coeficiente ?? 0;
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    const cantidad_barril_cerveza = Number(cantidadBarrilRaw || 0);
    const coeficiente_precio_venta = Number(coeficienteRaw || 0);

    const result = await pool.query(
      'INSERT INTO parametros_productos (cantidad_barril_cerveza, coeficiente_precio_venta, activo) VALUES ($1, $2, $3) RETURNING *',
      [cantidad_barril_cerveza, coeficiente_precio_venta, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear parámetro de producto', details: error.message });
  }
};

export const updateParametroProducto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const cantidadBarrilRaw = rawBody.cantidad_barril_cerveza ?? rawBody.cantidadBarrilCerveza ?? rawBody.cantidad_barril ?? undefined;
    const coeficienteRaw = rawBody.coeficiente_precio_venta ?? rawBody.coeficientePrecioVenta ?? rawBody.coeficiente ?? undefined;
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const cantidad_barril_cerveza = cantidadBarrilRaw === undefined ? undefined : Number(cantidadBarrilRaw || 0);
    const coeficiente_precio_venta = coeficienteRaw === undefined ? undefined : Number(coeficienteRaw || 0);
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (cantidad_barril_cerveza === undefined && coeficiente_precio_venta === undefined && activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (cantidad_barril_cerveza !== undefined) {
      params.push(cantidad_barril_cerveza);
      updatable.push(`cantidad_barril_cerveza = $${params.length}`);
    }

    if (coeficiente_precio_venta !== undefined) {
      params.push(coeficiente_precio_venta);
      updatable.push(`coeficiente_precio_venta = $${params.length}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updatable.push(`activo = $${params.length}`);
    }

    updatable.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE parametros_productos SET ${updatable.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetro de producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar parámetro de producto', details: error.message });
  }
};

export const deleteParametroProducto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM parametros_productos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetro de producto no encontrado' });
      return;
    }

    res.json({ message: 'Parámetro de producto eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar parámetro de producto', details: error.message });
  }
};