import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Producto } from '../types';

const validateReference = async (res: Response, tableName: string, value: number | string | null | undefined, fieldName: string): Promise<boolean> => {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  const numericValue = typeof value === 'string' ? Number(value) : value;

  if (Number.isNaN(numericValue)) {
    res.status(400).json({
      error: 'Referencia inválida',
      detalle: `El valor de ${fieldName} no es un número válido`,
    });
    return false;
  }

  const result = await pool.query(`SELECT id FROM ${tableName} WHERE id = $1`, [numericValue]);

  if (result.rows.length === 0) {
    res.status(400).json({
      error: 'Referencia inválida',
      detalle: `El valor de ${fieldName} no existe en ${tableName}`,
    });
    return false;
  }

  return true;
};

export const getAllProductos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = `
      SELECT p.*,
             g1.nombre AS grupo1prod_nombre,
             g2.nombre AS grupo2prod_nombre,
             pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN grupo1prod g1 ON g1.id = p.grupo1prod
      LEFT JOIN grupo2prod g2 ON g2.id = p.grupo2prod
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      WHERE 1=1`;
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND p.activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY p.nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
};

export const getProductoById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*,
             g1.nombre AS grupo1prod_nombre,
             g2.nombre AS grupo2prod_nombre,
             pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN grupo1prod g1 ON g1.id = p.grupo1prod
      LEFT JOIN grupo2prod g2 ON g2.id = p.grupo2prod
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      WHERE p.id = $1`, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener producto', details: error.message });
  }
};

export const createProducto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const nombrecorto = String(rawBody.nombrecorto ?? rawBody.shortName ?? '').trim();
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;
    const grupo1prodRaw = rawBody.grupo1prod ?? rawBody.grupo1Prod ?? rawBody.grupo_1_prod ?? null;
    const grupo2prodRaw = rawBody.grupo2prod ?? rawBody.grupo2Prod ?? rawBody.grupo_2_prod ?? null;
    const precioventaRaw = rawBody.precioventa ?? rawBody.precioVenta ?? rawBody.precio_venta ?? 0;
    const proveedorIdRaw = rawBody.proveedor_id ?? rawBody.proveedorId ?? rawBody.proveedor ?? null;

    const grupo1prod = grupo1prodRaw === null || grupo1prodRaw === '' ? null : Number(grupo1prodRaw);
    const grupo2prod = grupo2prodRaw === null || grupo2prodRaw === '' ? null : Number(grupo2prodRaw);
    const proveedorId = proveedorIdRaw === null || proveedorIdRaw === '' ? null : Number(proveedorIdRaw);
    const precioventa = Number(precioventaRaw || 0);

    if (!nombre || !nombrecorto) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren nombre y nombrecorto',
      });
      return;
    }

    const validGrupo1 = await validateReference(res, 'grupo1prod', grupo1prod, 'grupo1prod');
    if (!validGrupo1) return;

    const validGrupo2 = await validateReference(res, 'grupo2prod', grupo2prod, 'grupo2prod');
    if (!validGrupo2) return;

    const validProveedor = await validateReference(res, 'proveedores', proveedorId, 'proveedor_id');
    if (!validProveedor) return;

    const result = await pool.query(
      'INSERT INTO productos (nombre, nombrecorto, grupo1prod, grupo2prod, proveedor_id, precioventa, activo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nombre, nombrecorto, grupo1prod, grupo2prod, proveedorId, precioventa, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear producto', details: error.message });
  }
};

export const updateProducto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? rawBody.name ?? '').trim();
    const nombrecorto = String(rawBody.nombrecorto ?? rawBody.shortName ?? '').trim();
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;
    const grupo1prodRaw = rawBody.grupo1prod ?? rawBody.grupo1Prod ?? rawBody.grupo_1_prod ?? undefined;
    const grupo2prodRaw = rawBody.grupo2prod ?? rawBody.grupo2Prod ?? rawBody.grupo_2_prod ?? undefined;
    const precioventaRaw = rawBody.precioventa ?? rawBody.precioVenta ?? rawBody.precio_venta ?? undefined;
    const proveedorIdRaw = rawBody.proveedor_id ?? rawBody.proveedorId ?? rawBody.proveedor ?? undefined;
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );
    const grupo1prod = grupo1prodRaw === undefined || grupo1prodRaw === '' || grupo1prodRaw === null ? null : Number(grupo1prodRaw);
    const grupo2prod = grupo2prodRaw === undefined || grupo2prodRaw === '' || grupo2prodRaw === null ? null : Number(grupo2prodRaw);
    const proveedorId = proveedorIdRaw === undefined || proveedorIdRaw === '' || proveedorIdRaw === null ? null : Number(proveedorIdRaw);
    const precioventa = precioventaRaw === undefined ? undefined : Number(precioventaRaw || 0);

    if (!nombre || !nombrecorto || activo === undefined || precioventa === undefined) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren nombre, nombrecorto, precioventa y activo',
      });
      return;
    }

    const validGrupo1 = await validateReference(res, 'grupo1prod', grupo1prod, 'grupo1prod');
    if (!validGrupo1) return;

    const validGrupo2 = await validateReference(res, 'grupo2prod', grupo2prod, 'grupo2prod');
    if (!validGrupo2) return;

    const validProveedor = await validateReference(res, 'proveedores', proveedorId, 'proveedor_id');
    if (!validProveedor) return;

    const result = await pool.query(
      'UPDATE productos SET nombre = $1, nombrecorto = $2, grupo1prod = $3, grupo2prod = $4, proveedor_id = $5, precioventa = $6, activo = $7 WHERE id = $8 RETURNING *',
      [nombre, nombrecorto, grupo1prod, grupo2prod, proveedorId, precioventa, activo, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar producto', details: error.message });
  }
};

export const deleteProducto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar producto', details: error.message });
  }
};
