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
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre
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
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
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

    res.json({
      ...consumoResult.rows[0],
      items: itemsResult.rows,
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

    if (isNaN(mesaId)) {
      res.status(400).json({ error: 'La mesa es obligatoria' });
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

    const consumoResult = await client.query(
      'INSERT INTO consumos (mesa_id, cliente_id, estado, total) VALUES ($1, $2, $3, 0) RETURNING *',
      [mesaId, clienteId, estado]
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
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.id = $1`, [consumo.id]);

    res.status(201).json({ ...result.rows[0], total });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear consumo', details: error.message });
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

    if (!VALID_STATES.includes(estado)) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: `Estado inválido. Valores permitidos: ${VALID_STATES.join(', ')}` });
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

    await client.query(
      'UPDATE consumos SET mesa_id = $1, cliente_id = $2, estado = $3, updated_at = NOW() WHERE id = $4',
      [mesaId, clienteId, estado, id]
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
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
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