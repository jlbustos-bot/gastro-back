import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

const VALID_STATES = ['abierta', 'pagada', 'anulada'];

export const getAllConsumos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { estado } = req.query;
    const estadoValue = Array.isArray(estado) ? estado[0] : estado;
    let query = `
      SELECT c.*, m.numero AS mesa_numero,
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre,
             (SELECT string_agg(mp.nombre, ', ' ORDER BY cp.id)
              FROM consumo_pagos cp
              JOIN medios_pago mp ON mp.id = cp.medio_pago_id
              WHERE cp.consumo_id = c.id) AS medio_pago_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      WHERE 1=1`;
    const params: any[] = [];

    if (estadoValue !== undefined) {
      query += ' AND c.estado = $' + (params.length + 1);
      params.push(String(estadoValue));
    }

    query += ' ORDER BY c.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener consumos', details: error.message });
  }
};

export const getConsumoById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const consumoResult = await pool.query(`
      SELECT c.*, m.numero AS mesa_numero,
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre,
             mp.nombre AS medio_pago_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN medios_pago mp ON mp.id = c.medio_pago_id
      WHERE c.id = $1`, [id]);

    if (consumoResult.rows.length === 0) {
      res.status(404).json({ error: 'Consumo no encontrado' });
      return;
    }

    const itemsResult = await pool.query(`
      SELECT ci.*, p.nombre AS producto_nombre
      FROM consumo_items ci
      LEFT JOIN productos p ON p.id = ci.producto_id
      WHERE ci.consumo_id = $1
      ORDER BY ci.id`, [id]);

    const pagosResult = await pool.query(`
      SELECT cp.*, mp.nombre AS medio_pago_nombre
      FROM consumo_pagos cp
      LEFT JOIN medios_pago mp ON mp.id = cp.medio_pago_id
      WHERE cp.consumo_id = $1
      ORDER BY cp.id`, [id]);

    res.json({
      ...consumoResult.rows[0],
      items: itemsResult.rows,
      pagos: pagosResult.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener consumo', details: error.message });
  }
};

const recalculateTotal = async (client: any, consumoId: number): Promise<number> => {
  const totalResult = await client.query(
    'SELECT COALESCE(SUM(precio * cantidad), 0) AS total FROM consumo_items WHERE consumo_id = $1',
    [consumoId]
  );
  const total = Number(totalResult.rows[0].total);
  await client.query('UPDATE consumos SET total = $1, updated_at = NOW() WHERE id = $2', [total, consumoId]);
  return total;
};

const setMesaState = async (client: any, mesaId: number, estado: string): Promise<void> => {
  await client.query('UPDATE mesas SET estado = $1, updated_at = NOW() WHERE id = $2', [estado, mesaId]);
};

const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFechasConsumo = (): { fechaCreacion: string; fechaCaja: string } => {
  const now = new Date();
  const fechaCreacion = toDateString(now);

  const cajaDate = new Date(now);
  if (now.getHours() < 8) {
    cajaDate.setDate(cajaDate.getDate() - 1);
  }
  const fechaCaja = toDateString(cajaDate);

  return { fechaCreacion, fechaCaja };
};

export const createConsumo = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rawBody = req.body || {};
    const mesaId = Number(rawBody.mesa_id ?? rawBody.mesaId);
    const clienteIdRaw = rawBody.cliente_id ?? rawBody.clienteId;
    const clienteId = clienteIdRaw === undefined || clienteIdRaw === null || clienteIdRaw === '' ? null : Number(clienteIdRaw);
    const estado = String(rawBody.estado ?? rawBody.status ?? 'abierta').trim() || 'abierta';
    const itemsRaw = rawBody.items;
    const medioPagoRaw = rawBody.medio_pago_id ?? rawBody.medioPagoId;
    const medioPagoId = medioPagoRaw === undefined || medioPagoRaw === null || medioPagoRaw === ''
      ? null
      : Number(medioPagoRaw);

    if (isNaN(mesaId)) {
      res.status(400).json({ error: 'La mesa es obligatoria' });
      return;
    }

    if (medioPagoId !== null && isNaN(medioPagoId)) {
      res.status(400).json({ error: 'El medio de pago es inválido' });
      return;
    }

    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      res.status(400).json({ error: 'Debe registrar al menos un item de consumo' });
      return;
    }

    const mesaResult = await client.query('SELECT * FROM mesas WHERE id = $1', [mesaId]);
    if (mesaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'La mesa seleccionada no existe' });
      return;
    }

    if (medioPagoId !== null) {
      const medioPagoResult = await client.query('SELECT id FROM medios_pago WHERE id = $1', [medioPagoId]);
      if (medioPagoResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'El medio de pago seleccionado no existe' });
        return;
      }
    }

    const { fechaCreacion, fechaCaja } = getFechasConsumo();

    const consumoResult = await client.query(
      'INSERT INTO consumos (mesa_id, cliente_id, estado, total, medio_pago_id, fecha_creacion, fecha_caja) VALUES ($1, $2, $3, 0, $4, $5, $6) RETURNING *',
      [mesaId, clienteId, estado, medioPagoId, fechaCreacion, fechaCaja]
    );
    const consumo = consumoResult.rows[0];

    for (const item of itemsRaw) {
      const productoId = Number(item.producto_id ?? item.productoId);
      const cantidad = Number(item.cantidad ?? item.quantity ?? 1);

      if (isNaN(productoId) || cantidad <= 0) {
        throw new Error('Item inválido: producto_id y cantidad son obligatorios');
      }

      const productoResult = await client.query('SELECT precioventa FROM productos WHERE id = $1', [productoId]);
      if (productoResult.rows.length === 0) {
        throw new Error(`Producto ${productoId} no encontrado`);
      }

      await client.query(
        'INSERT INTO consumo_items (consumo_id, producto_id, cantidad, precio) VALUES ($1, $2, $3, $4)',
        [consumo.id, productoId, cantidad, Number(productoResult.rows[0].precioventa)]
      );
    }

    const total = await recalculateTotal(client, consumo.id);

    if (estado === 'abierta') {
      await setMesaState(client, mesaId, 'ocupada');
    }

    await client.query('COMMIT');

    const result = await pool.query(`
      SELECT c.*, m.numero AS mesa_numero,
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre,
             mp.nombre AS medio_pago_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN medios_pago mp ON mp.id = c.medio_pago_id
      WHERE c.id = $1`, [consumo.id]);

    res.status(201).json({ ...result.rows[0], total });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear consumo', details: error.message });
  } finally {
    client.release();
  }
};

export const payConsumo = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const rawBody = req.body || {};
    const rawPagos = rawBody.pagos ?? rawBody.payments;
    const userId = req.user?.id ?? null;

    if (!Array.isArray(rawPagos) || rawPagos.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Debe registrar al menos un pago' });
      return;
    }

    const consumoResult = await client.query('SELECT * FROM consumos WHERE id = $1 FOR UPDATE', [id]);
    if (consumoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Consumo no encontrado' });
      return;
    }
    const consumo = consumoResult.rows[0];

    if (consumo.estado !== 'abierta') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'El consumo no se encuentra abierto' });
      return;
    }

    let totalPagado = 0;
    for (const pago of rawPagos) {
      const medioId = Number(pago.medio_pago_id ?? pago.medioPagoId);
      const monto = Number(pago.monto ?? pago.amount ?? 0);

      if (isNaN(medioId) || isNaN(monto) || monto <= 0) {
        throw new Error('Pago inválido: medio de pago y monto son obligatorios y el monto debe ser mayor a 0');
      }

      const medioResult = await client.query('SELECT id FROM medios_pago WHERE id = $1', [medioId]);
      if (medioResult.rows.length === 0) {
        throw new Error(`Medio de pago ${medioId} no encontrado`);
      }

      await client.query(
        'INSERT INTO consumo_pagos (consumo_id, medio_pago_id, monto, user_id) VALUES ($1, $2, $3, $4)',
        [consumo.id, medioId, monto, userId]
      );
      totalPagado += monto;
    }

    totalPagado = Math.round(totalPagado * 100) / 100;
    const consumoTotal = Math.round(Number(consumo.total) * 100) / 100;

    if (Math.abs(totalPagado - consumoTotal) > 0.01) {
      throw new Error(`El total pagado (${totalPagado.toFixed(2)}) no coincide con el total del consumo (${consumoTotal.toFixed(2)})`);
    }

    await client.query(
      'UPDATE consumos SET estado = $1, updated_at = NOW() WHERE id = $2',
      ['pagada', consumo.id]
    );
    await setMesaState(client, consumo.mesa_id, 'libre');

    await client.query('COMMIT');

    const result = await pool.query(`
      SELECT c.*, m.numero AS mesa_numero,
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre,
             (SELECT string_agg(mp.nombre, ', ' ORDER BY cp.id)
              FROM consumo_pagos cp
              JOIN medios_pago mp ON mp.id = cp.medio_pago_id
              WHERE cp.consumo_id = c.id) AS medio_pago_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.id = $1`, [consumo.id]);

    const pagosResult = await pool.query(`
      SELECT cp.*, mp.nombre AS medio_pago_nombre
      FROM consumo_pagos cp
      LEFT JOIN medios_pago mp ON mp.id = cp.medio_pago_id
      WHERE cp.consumo_id = $1
      ORDER BY cp.id`, [id]);

    res.json({ ...result.rows[0], pagos: pagosResult.rows });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: 'Error al registrar el pago', details: error.message });
  } finally {
    client.release();
  }
};

export const updateConsumo = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const rawBody = req.body || {};

    const currentResult = await client.query('SELECT * FROM consumos WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Consumo no encontrado' });
      return;
    }
    const current = currentResult.rows[0];

    const mesaIdRaw = rawBody.mesa_id ?? rawBody.mesaId;
    const mesaId = mesaIdRaw === undefined || mesaIdRaw === null || mesaIdRaw === '' ? current.mesa_id : Number(mesaIdRaw);
    const clienteIdRaw = rawBody.cliente_id ?? rawBody.clienteId;
    const clienteId = clienteIdRaw === undefined || clienteIdRaw === null || clienteIdRaw === ''
      ? current.cliente_id
      : (String(clienteIdRaw).trim() === '' ? null : Number(clienteIdRaw));
    const estadoRaw = rawBody.estado ?? rawBody.status;
    const estado = estadoRaw === undefined || estadoRaw === null || estadoRaw === '' ? current.estado : String(estadoRaw).trim();
    const medioPagoRaw = rawBody.medio_pago_id ?? rawBody.medioPagoId;
    const medioPagoId = medioPagoRaw === undefined || medioPagoRaw === null || medioPagoRaw === ''
      ? current.medio_pago_id ?? null
      : Number(medioPagoRaw);

    if (!VALID_STATES.includes(estado)) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: `Estado inválido. Valores permitidos: ${VALID_STATES.join(', ')}` });
      return;
    }

    if (medioPagoId !== null && isNaN(medioPagoId)) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'El medio de pago es inválido' });
      return;
    }

    if (isNaN(mesaId)) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'La mesa es obligatoria' });
      return;
    }

    const mesaResult = await client.query('SELECT * FROM mesas WHERE id = $1', [mesaId]);
    if (mesaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'La mesa seleccionada no existe' });
      return;
    }

    let itemsRaw = rawBody.items;
    if (itemsRaw !== undefined && itemsRaw !== null) {
      if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Debe registrar al menos un item de consumo' });
        return;
      }

      await client.query('DELETE FROM consumo_items WHERE consumo_id = $1', [id]);

      for (const item of itemsRaw) {
        const productoId = Number(item.producto_id ?? item.productoId);
        const cantidad = Number(item.cantidad ?? item.quantity ?? 1);

        if (isNaN(productoId) || cantidad <= 0) {
          throw new Error('Item inválido: producto_id y cantidad son obligatorios');
        }

        const productoResult = await client.query('SELECT precioventa FROM productos WHERE id = $1', [productoId]);
        if (productoResult.rows.length === 0) {
          throw new Error(`Producto ${productoId} no encontrado`);
        }

        await client.query(
          'INSERT INTO consumo_items (consumo_id, producto_id, cantidad, precio) VALUES ($1, $2, $3, $4)',
          [id, productoId, cantidad, Number(productoResult.rows[0].precioventa)]
        );
      }
    }

    if (medioPagoId !== null) {
      const medioPagoResult = await client.query('SELECT id FROM medios_pago WHERE id = $1', [medioPagoId]);
      if (medioPagoResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'El medio de pago seleccionado no existe' });
        return;
      }
    }

    await client.query(
      'UPDATE consumos SET mesa_id = $1, cliente_id = $2, estado = $3, medio_pago_id = $4, updated_at = NOW() WHERE id = $5',
      [mesaId, clienteId, estado, medioPagoId, id]
    );

    await recalculateTotal(client, Number(id));

    if (estado === 'abierta') {
      await setMesaState(client, mesaId, 'ocupada');
    } else {
      await setMesaState(client, mesaId, 'libre');
      if (mesaId !== current.mesa_id && current.estado === 'abierta') {
        await setMesaState(client, current.mesa_id, 'libre');
      }
    }

    await client.query('COMMIT');

    const result = await pool.query(`
      SELECT c.*, m.numero AS mesa_numero,
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre,
             mp.nombre AS medio_pago_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN medios_pago mp ON mp.id = c.medio_pago_id
      WHERE c.id = $1`, [id]);

    res.json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar consumo', details: error.message });
  } finally {
    client.release();
  }
};

export const deleteConsumo = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const currentResult = await client.query('SELECT * FROM consumos WHERE id = $1', [id]);

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Consumo no encontrado' });
      return;
    }

    const current = currentResult.rows[0];

    await client.query('DELETE FROM consumo_items WHERE consumo_id = $1', [id]);
    const result = await client.query('DELETE FROM consumos WHERE id = $1 RETURNING *', [id]);

    if (current.estado === 'abierta') {
      await setMesaState(client, current.mesa_id, 'libre');
    }

    await client.query('COMMIT');
    res.json({ message: 'Consumo eliminado exitosamente' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar consumo', details: error.message });
  } finally {
    client.release();
  }
};