import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

const validateReference = async (res: Response, tableName: string, value: number | string | null | undefined, fieldName: string): Promise<boolean> => {
  if (value === null || value === undefined || value === '') {
    res.status(400).json({
      error: 'Referencia inválida',
      detalle: `El valor de ${fieldName} es obligatorio`,
    });
    return false;
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

const round2 = (value: number): number => Math.round(value * 100) / 100;

const getCantidadBarrilCerveza = async (): Promise<number | null> => {
  const result = await pool.query(
    'SELECT cantidad_barril_cerveza FROM parametros_productos WHERE activo = true ORDER BY id LIMIT 1'
  );
  return result.rows.length > 0 ? Number(result.rows[0].cantidad_barril_cerveza) : null;
};

const applyPrecioBarrilRule = async (productoId: number, precioPorLitro: number, precioBarrilActual: number): Promise<number> => {
  const result = await pool.query('SELECT grupo1prod FROM productos WHERE id = $1', [productoId]);
  const grupo1 = result.rows.length > 0 ? result.rows[0].grupo1prod : null;

  if (grupo1 === 1 && precioPorLitro > 0) {
    const cantidadBarril = await getCantidadBarrilCerveza();
    if (cantidadBarril !== null) {
      return round2(precioPorLitro * cantidadBarril);
    }
  }

  return precioBarrilActual;
};

const getCoeficientePrecioVenta = async (): Promise<number | null> => {
  const result = await pool.query(
    'SELECT coeficiente_precio_venta FROM parametros_productos WHERE activo = true ORDER BY id LIMIT 1'
  );
  return result.rows.length > 0 ? Number(result.rows[0].coeficiente_precio_venta) : null;
};

const applyPrecioVentaSugeridoRule = async (productoId: number, precioPorLitro: number, precioVentaSugeridoActual: number): Promise<number> => {
  const result = await pool.query('SELECT grupo1prod FROM productos WHERE id = $1', [productoId]);
  const grupo1 = result.rows.length > 0 ? result.rows[0].grupo1prod : null;

  if (grupo1 === 1 && precioPorLitro > 0) {
    const coeficiente = await getCoeficientePrecioVenta();
    if (coeficiente !== null) {
      return round2(precioPorLitro * coeficiente);
    }
  }

  return precioVentaSugeridoActual;
};

export const getAllProductoProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo, producto_id, proveedor_id } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    const productoValue = Array.isArray(producto_id) ? producto_id[0] : producto_id;
    const proveedorValue = Array.isArray(proveedor_id) ? proveedor_id[0] : proveedor_id;

    let query = `
      SELECT pp.*,
             p.nombre AS producto_nombre,
             pr.nombre AS proveedor_nombre
      FROM producto_proveedor pp
      LEFT JOIN productos p ON p.id = pp.producto_id
      LEFT JOIN proveedores pr ON pr.id = pp.proveedor_id
      WHERE 1=1`;
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' AND pp.activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    if (productoValue !== undefined && productoValue !== '') {
      query += ' AND pp.producto_id = $' + (params.length + 1);
      params.push(Number(productoValue));
    }

    if (proveedorValue !== undefined && proveedorValue !== '') {
      query += ' AND pp.proveedor_id = $' + (params.length + 1);
      params.push(Number(proveedorValue));
    }

    query += ' ORDER BY p.nombre, pr.nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener precio de productos por proveedor', details: error.message });
  }
};

export const getProductoProveedorById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT pp.*,
             p.nombre AS producto_nombre,
             pr.nombre AS proveedor_nombre
      FROM producto_proveedor pp
      LEFT JOIN productos p ON p.id = pp.producto_id
      LEFT JOIN proveedores pr ON pr.id = pp.proveedor_id
      WHERE pp.id = $1`, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Registro producto-proveedor no encontrado' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener registro producto-proveedor', details: error.message });
  }
};

export const createProductoProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const productoIdRaw = rawBody.producto_id ?? rawBody.productoId ?? null;
    const proveedorIdRaw = rawBody.proveedor_id ?? rawBody.proveedorId ?? null;
    const precioPorLitroRaw = rawBody.precio_por_litro ?? rawBody.precioPorLitro ?? 0;
    const precioBarrilRaw = rawBody.precio_barril ?? rawBody.precioBarril ?? 0;
    const precioVentaSugeridoRaw = rawBody.precio_venta_sugerido ?? rawBody.precioVentaSugerido ?? rawBody.precio_venta ?? 0;
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    const productoId = productoIdRaw === '' ? null : Number(productoIdRaw);
    const proveedorId = proveedorIdRaw === '' ? null : Number(proveedorIdRaw);
    const precioPorLitro = Number(precioPorLitroRaw || 0);
    let precioBarril = Number(precioBarrilRaw || 0);
    let precioVentaSugerido = Number(precioVentaSugeridoRaw || 0);

    if (!productoId || !proveedorId) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requieren producto_id y proveedor_id',
      });
      return;
    }

    const validProducto = await validateReference(res, 'productos', productoId, 'producto_id');
    if (!validProducto) return;

    const validProveedor = await validateReference(res, 'proveedores', proveedorId, 'proveedor_id');
    if (!validProveedor) return;

    precioBarril = await applyPrecioBarrilRule(productoId, precioPorLitro, precioBarril);
    precioVentaSugerido = await applyPrecioVentaSugeridoRule(productoId, precioPorLitro, precioVentaSugerido);

    const result = await pool.query(
      'INSERT INTO producto_proveedor (producto_id, proveedor_id, precio_por_litro, precio_barril, precio_venta_sugerido, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [productoId, proveedorId, precioPorLitro, precioBarril, precioVentaSugerido, activo]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ error: 'Ya existe un registro para ese producto y proveedor' });
      return;
    }
    res.status(500).json({ error: 'Error al crear registro producto-proveedor', details: error.message });
  }
};

export const updateProductoProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};
    const productoIdRaw = rawBody.producto_id ?? rawBody.productoId ?? undefined;
    const proveedorIdRaw = rawBody.proveedor_id ?? rawBody.proveedorId ?? undefined;
    const precioPorLitroRaw = rawBody.precio_por_litro ?? rawBody.precioPorLitro ?? undefined;
    const precioBarrilRaw = rawBody.precio_barril ?? rawBody.precioBarril ?? undefined;
    const precioVentaSugeridoRaw = rawBody.precio_venta_sugerido ?? rawBody.precioVentaSugerido ?? rawBody.precio_venta ?? undefined;
    const activoRaw = rawBody.activo ?? rawBody.active ?? undefined;

    const productoId = productoIdRaw === undefined || productoIdRaw === '' || productoIdRaw === null ? undefined : Number(productoIdRaw);
    const proveedorId = proveedorIdRaw === undefined || proveedorIdRaw === '' || proveedorIdRaw === null ? undefined : Number(proveedorIdRaw);
    const precioPorLitro = precioPorLitroRaw === undefined ? undefined : Number(precioPorLitroRaw || 0);
    let precioBarril = precioBarrilRaw === undefined ? undefined : Number(precioBarrilRaw || 0);
    let precioVentaSugerido = precioVentaSugeridoRaw === undefined ? undefined : Number(precioVentaSugeridoRaw || 0);
    const activo = activoRaw === undefined ? undefined : (
      activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true
    );

    if (productoId === undefined && proveedorId === undefined && precioPorLitro === undefined && precioBarril === undefined && precioVentaSugerido === undefined && activo === undefined) {
      res.status(400).json({
        error: 'Faltan campos',
        received: rawBody,
        detalle: 'Se requiere al menos un campo para actualizar',
      });
      return;
    }

    if (productoId !== undefined) {
      const validProducto = await validateReference(res, 'productos', productoId, 'producto_id');
      if (!validProducto) return;
    }

    if (proveedorId !== undefined) {
      const validProveedor = await validateReference(res, 'proveedores', proveedorId, 'proveedor_id');
      if (!validProveedor) return;
    }

    const currentResult = await pool.query('SELECT * FROM producto_proveedor WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'Registro producto-proveedor no encontrado' });
      return;
    }

    const current = currentResult.rows[0];
    const newProductoId = productoId !== undefined ? productoId : current.producto_id;
    const newProveedorId = proveedorId !== undefined ? proveedorId : current.proveedor_id;

    const finalPrecioPorLitro = precioPorLitro !== undefined ? precioPorLitro : Number(current.precio_por_litro);
    let finalPrecioBarril = precioBarril !== undefined ? precioBarril : Number(current.precio_barril);
    finalPrecioBarril = await applyPrecioBarrilRule(newProductoId, finalPrecioPorLitro, finalPrecioBarril);

    let finalPrecioVentaSugerido = precioVentaSugerido !== undefined ? precioVentaSugerido : Number(current.precio_venta_sugerido);
    finalPrecioVentaSugerido = await applyPrecioVentaSugeridoRule(newProductoId, finalPrecioPorLitro, finalPrecioVentaSugerido);

    const duplicateCheck = await pool.query(
      'SELECT id FROM producto_proveedor WHERE producto_id = $1 AND proveedor_id = $2 AND id <> $3',
      [newProductoId, newProveedorId, id]
    );
    if (duplicateCheck.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe un registro para ese producto y proveedor' });
      return;
    }

    const result = await pool.query(
      'UPDATE producto_proveedor SET producto_id = $1, proveedor_id = $2, precio_por_litro = $3, precio_barril = $4, precio_venta_sugerido = $5, activo = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [
        newProductoId,
        newProveedorId,
        finalPrecioPorLitro,
        finalPrecioBarril,
        finalPrecioVentaSugerido,
        activo !== undefined ? activo : current.activo,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ error: 'Ya existe un registro para ese producto y proveedor' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar registro producto-proveedor', details: error.message });
  }
};

export const deleteProductoProveedor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM producto_proveedor WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Registro producto-proveedor no encontrado' });
      return;
    }

    res.json({ message: 'Registro producto-proveedor eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar registro producto-proveedor', details: error.message });
  }
};