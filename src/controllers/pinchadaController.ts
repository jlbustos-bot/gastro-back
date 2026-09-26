import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getAllPinchadas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { canilla_id, producto_id } = req.query;
    const canillaValue = Array.isArray(canilla_id) ? canilla_id[0] : canilla_id;
    const productoValue = Array.isArray(producto_id) ? producto_id[0] : producto_id;
    let query = `
      SELECT pc.id, pc.canilla_id, pc.producto_id, pc.fecha_inicio, pc.fecha_fin,
             pc.cantidad_vendida, pc.created_at, pc.updated_at,
             c.nombre AS canilla_nombre,
             p.nombre AS producto_nombre,
             p.nombrecorto AS producto_nombrecorto,
             p.precioventa AS producto_precioventa
      FROM pinchada_canillas pc
      LEFT JOIN canillas c ON c.id = pc.canilla_id
      LEFT JOIN productos p ON p.id = pc.producto_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (canillaValue !== undefined && canillaValue !== '') {
      query += ' AND pc.canilla_id = $' + (params.length + 1);
      params.push(Number(canillaValue));
    }

    if (productoValue !== undefined && productoValue !== '') {
      query += ' AND pc.producto_id = $' + (params.length + 1);
      params.push(Number(productoValue));
    }

    query += ' ORDER BY pc.fecha_inicio DESC, pc.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener pinchadas de canillas', details: error.message });
  }
};

export const getPinchadaById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT pc.id, pc.canilla_id, pc.producto_id, pc.fecha_inicio, pc.fecha_fin,
              pc.cantidad_vendida, pc.created_at, pc.updated_at,
              c.nombre AS canilla_nombre,
              p.nombre AS producto_nombre,
              p.nombrecorto AS producto_nombrecorto,
              p.precioventa AS producto_precioventa
       FROM pinchada_canillas pc
       LEFT JOIN canillas c ON c.id = pc.canilla_id
       LEFT JOIN productos p ON p.id = pc.producto_id
       WHERE pc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pinchada no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener pinchada', details: error.message });
  }
};

const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createPinchada = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rawBody = req.body || {};
    const canilla_id_raw = rawBody.canilla_id ?? rawBody.canillaId ?? undefined;
    const canilla_id = canilla_id_raw === undefined || canilla_id_raw === null || canilla_id_raw === ''
      ? null
      : Number(canilla_id_raw);
    const producto_id = Number(rawBody.producto_id ?? rawBody.productoId ?? NaN);
    const fecha_inicio = String(rawBody.fecha_inicio ?? rawBody.fechaInicio ?? '').trim();
    const fecha_fin_raw = rawBody.fecha_fin ?? rawBody.fechaFin ?? '';
    const fecha_fin = fecha_fin_raw === '' || fecha_fin_raw === null || fecha_fin_raw === undefined ? null : String(fecha_fin_raw).trim();
    const cantidad = Number(rawBody.cantidad_vendida ?? rawBody.cantidadVendida ?? 0);
    const cantidad_vendida = Math.max(0, Math.round(cantidad * 100) / 100);

    if (canilla_id === null || isNaN(canilla_id)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere la canilla a pinchar',
      });
      return;
    }

    if (!producto_id || Number.isNaN(producto_id)) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere la cerveza pinchada',
      });
      return;
    }

    if (!fecha_inicio) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere la fecha de inicio',
      });
      return;
    }

    if (fecha_fin && fecha_fin < fecha_inicio) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: 'Fechas inválidas',
        received: rawBody,
        detalle: 'La fecha fin no puede ser anterior a la fecha inicio',
      });
      return;
    }

    const canillaResult = await client.query('SELECT id, nombre, activo FROM canillas WHERE id = $1', [canilla_id]);
    if (canillaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'La canilla seleccionada no existe' });
      return;
    }

    const hoy = toDateString(new Date());

    const prevResult = await client.query(
      `UPDATE pinchada_canillas SET fecha_fin = $2, updated_at = NOW()
       WHERE canilla_id = $1 AND fecha_fin IS NULL
       RETURNING id`,
      [canilla_id, hoy]
    );

    let aviso: string | undefined;
    if (prevResult.rows.length === 0) {
      aviso = 'Aviso: anteriormente no había una cerveza pinchada en esta canilla.';
    }

    await client.query(
      'UPDATE canillas SET producto_id = $1, activo = true, updated_at = NOW() WHERE id = $2',
      [producto_id, canilla_id]
    );

    const result = await client.query(
      `INSERT INTO pinchada_canillas (canilla_id, producto_id, fecha_inicio, fecha_fin, cantidad_vendida)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, canilla_id, producto_id, fecha_inicio, fecha_fin, cantidad_vendida, created_at, updated_at`,
      [canilla_id, producto_id, fecha_inicio, fecha_fin, cantidad_vendida]
    );

    await client.query('COMMIT');

    if (aviso) {
      res.status(201).json({ ...result.rows[0], aviso });
    } else {
      res.status(201).json(result.rows[0]);
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear pinchada', details: error.message });
  } finally {
    client.release();
  }
};

export const updatePinchada = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const canillaValue = rawBody.canilla_id !== undefined ? rawBody.canilla_id : rawBody.canillaId;
    const hasCanilla = canillaValue !== undefined;
    const canilla_id = !hasCanilla
      ? undefined
      : (canillaValue === null || canillaValue === '' ? null : Number(canillaValue));
    const productoValue = rawBody.producto_id !== undefined ? rawBody.producto_id : rawBody.productoId;
    const hasProducto = productoValue !== undefined;
    const producto_id = !hasProducto ? undefined : Number(productoValue);
    const fechaInicioValue = rawBody.fecha_inicio !== undefined ? rawBody.fecha_inicio : rawBody.fechaInicio;
    const hasFechaInicio = fechaInicioValue !== undefined;
    const fecha_inicio = !hasFechaInicio ? undefined : String(fechaInicioValue ?? '').trim();
    const fechaFinValue = rawBody.fecha_fin !== undefined ? rawBody.fecha_fin : rawBody.fechaFin;
    const hasFechaFin = fechaFinValue !== undefined;
    const fecha_fin = !hasFechaFin
      ? undefined
      : (fechaFinValue === null || fechaFinValue === '' ? null : String(fechaFinValue).trim());
    const cantidadValue = rawBody.cantidad_vendida !== undefined ? rawBody.cantidad_vendida : rawBody.cantidadVendida;
    const hasCantidad = cantidadValue !== undefined;
    const cantidad_vendida = !hasCantidad ? undefined : Math.max(0, Math.round(Number(cantidadValue || 0) * 100) / 100);

    if (!hasCanilla && !hasProducto && !hasFechaInicio && !hasFechaFin && !hasCantidad) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    if (producto_id !== undefined && (!producto_id || Number.isNaN(producto_id))) {
      res.status(400).json({
        error: 'Producto inválido',
        received: rawBody,
      });
      return;
    }

    const currentResult = await pool.query('SELECT fecha_inicio FROM pinchada_canillas WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'Pinchada no encontrada' });
      return;
    }
    const current = currentResult.rows[0];

    const effectiveInicio = fecha_inicio !== undefined ? fecha_inicio : String(current.fecha_inicio).slice(0, 10);
    if (fecha_fin !== undefined && fecha_fin !== null && fecha_fin < effectiveInicio) {
      res.status(400).json({
        error: 'Fechas inválidas',
        received: rawBody,
        detalle: 'La fecha fin no puede ser anterior a la fecha inicio',
      });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (hasCanilla) {
      params.push(canilla_id);
      updatable.push(`canilla_id = $${params.length}`);
    }

    if (hasProducto) {
      params.push(producto_id);
      updatable.push(`producto_id = $${params.length}`);
    }

    if (hasFechaInicio) {
      params.push(fecha_inicio);
      updatable.push(`fecha_inicio = $${params.length}`);
    }

    if (hasFechaFin) {
      params.push(fecha_fin);
      updatable.push(`fecha_fin = $${params.length}`);
    }

    if (hasCantidad) {
      params.push(cantidad_vendida);
      updatable.push(`cantidad_vendida = $${params.length}`);
    }

    updatable.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE pinchada_canillas SET ${updatable.join(', ')} WHERE id = $${params.length}
       RETURNING id, canilla_id, producto_id, fecha_inicio, fecha_fin, cantidad_vendida, created_at, updated_at`,
      params
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar pinchada', details: error.message });
  }
};

export const deletePinchada = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pinchada_canillas WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pinchada no encontrada' });
      return;
    }

    res.json({ message: 'Pinchada eliminada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar pinchada', details: error.message });
  }
};