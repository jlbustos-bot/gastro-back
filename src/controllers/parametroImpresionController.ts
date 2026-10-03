import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getAllParametrosImpresion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = 'SELECT * FROM parametros_impresion WHERE 1=1';
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener parámetros de impresión', details: error.message });
  }
};

export const getParametroImpresionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM parametros_impresion WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetro de impresión no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener parámetro de impresión', details: error.message });
  }
};

export const createParametroImpresion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const cantidadCopiasRaw = rawBody.cantidad_copias ?? rawBody.cantidadCopias ?? 1;
    const impresoraInformes = String(rawBody.impresora_informes ?? rawBody.impresoraInformes ?? '').trim();
    const impresoraTicket = String(rawBody.impresora_ticket ?? rawBody.impresoraTicket ?? '').trim();
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    const cantidad_copias = Math.max(1, Math.round(Number(cantidadCopiasRaw || 1)));

    const result = await pool.query(
      'INSERT INTO parametros_impresion (cantidad_copias, impresora_informes, impresora_ticket, activo) VALUES ($1, $2, $3, $4) RETURNING *',
      [cantidad_copias, impresoraInformes, impresoraTicket, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear parámetro de impresión', details: error.message });
  }
};

export const updateParametroImpresion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const cantidadCopiasRaw = rawBody.cantidad_copias ?? rawBody.cantidadCopias ?? undefined;
    const impresoraInformes = rawBody.impresora_informes === undefined
      ? undefined
      : String(rawBody.impresora_informes ?? '').trim();
    const impresoraTicket = rawBody.impresora_ticket === undefined
      ? undefined
      : String(rawBody.impresora_ticket ?? '').trim();
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const cantidad_copias = cantidadCopiasRaw === undefined ? undefined : Math.max(1, Math.round(Number(cantidadCopiasRaw || 1)));
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (cantidad_copias === undefined && impresoraInformes === undefined && impresoraTicket === undefined && activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (cantidad_copias !== undefined) {
      params.push(cantidad_copias);
      updatable.push(`cantidad_copias = $${params.length}`);
    }

    if (impresoraInformes !== undefined) {
      params.push(impresoraInformes);
      updatable.push(`impresora_informes = $${params.length}`);
    }

    if (impresoraTicket !== undefined) {
      params.push(impresoraTicket);
      updatable.push(`impresora_ticket = $${params.length}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updatable.push(`activo = $${params.length}`);
    }

    updatable.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE parametros_impresion SET ${updatable.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetro de impresión no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar parámetro de impresión', details: error.message });
  }
};

export const deleteParametroImpresion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM parametros_impresion WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Parámetro de impresión no encontrado' });
      return;
    }

    res.json({ message: 'Parámetro de impresión eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar parámetro de impresión', details: error.message });
  }
};