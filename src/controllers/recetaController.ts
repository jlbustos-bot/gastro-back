import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const RECETA_SELECT = `
  SELECT r.id, r.nombre, r.producto_id, r.descripcion, r.cantidad_rinde, r.unidad,
         r.costo_total, r.observaciones, r.activo, r.created_at, r.updated_at,
         p.nombre AS producto_nombre,
         p.precioventa AS producto_precioventa
  FROM recetas r
  LEFT JOIN productos p ON p.id = r.producto_id
`;

const COMPONENTE_SELECT = `
  SELECT rc.id, rc.receta_id, rc.producto_id, rc.nombre, rc.cantidad, rc.unidad,
         rc.costo_unitario, rc.costo_total, rc.created_at, rc.updated_at,
         p.nombre AS producto_nombre
  FROM receta_componentes rc
  LEFT JOIN productos p ON p.id = rc.producto_id
`;

const toNullableId = (value: any): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toNum = (value: any, fallback = 0): number => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const recalcularCostoTotal = async (recetaId: number): Promise<number> => {
  const result = await pool.query(
    'SELECT COALESCE(SUM(costo_total), 0) AS total FROM receta_componentes WHERE receta_id = $1',
    [recetaId]
  );
  const total = round2(Number(result.rows[0]?.total ?? 0));
  await pool.query('UPDATE recetas SET costo_total = $1, updated_at = NOW() WHERE id = $2', [total, recetaId]);
  return total;
};

const getComponentes = async (recetaId: number) => {
  const result = await pool.query(`${COMPONENTE_SELECT} WHERE rc.receta_id = $1 ORDER BY rc.id`, [recetaId]);
  return result.rows;
};

const getPrecioCompra = async (productoId: number | null): Promise<number | null> => {
  if (productoId === null) {
    return null;
  }

  const result = await pool.query('SELECT preciocompra FROM productos WHERE id = $1', [productoId]);
  if (result.rows.length === 0) {
    return null;
  }

  return Number(result.rows[0].preciocompra ?? 0);
};

const resolverCostoUnitario = async (componente: any): Promise<number> => {
  const productoId = toNullableId(componente?.producto_id ?? componente?.productoId);
  if (productoId !== null) {
    const precioCompra = await getPrecioCompra(productoId);
    if (precioCompra !== null) {
      return precioCompra;
    }
  }
  return toNum(componente?.costo_unitario ?? componente?.costoUnitario, 0);
};

const guardarComponentes = async (recetaId: number, componentesRaw: any[], unidadDefault: string) => {
  for (const componente of componentesRaw) {
    const componenteNombre = String(componente?.nombre ?? '').trim();
    if (!componenteNombre) {
      continue;
    }
    const cantidad = toNum(componente?.cantidad, 1);
    const costoUnitario = await resolverCostoUnitario(componente);
    await pool.query(
      `INSERT INTO receta_componentes (receta_id, producto_id, nombre, cantidad, unidad, costo_unitario, costo_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recetaId,
        toNullableId(componente?.producto_id ?? componente?.productoId),
        componenteNombre,
        cantidad,
        componente?.unidad ? String(componente.unidad).trim() : unidadDefault,
        costoUnitario,
        round2(cantidad * costoUnitario),
      ]
    );
  }
};

export const getAllRecetas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activo } = req.query;
    const activoValue = Array.isArray(activo) ? activo[0] : activo;
    let query = RECETA_SELECT;
    const params: any[] = [];

    if (activoValue !== undefined) {
      query += ' WHERE r.activo = $' + (params.length + 1);
      params.push(activoValue === 'true' || activoValue === '1');
    }

    query += ' ORDER BY r.id';
    const result = await pool.query(query, params);
    const recetas = result.rows;

    const componentesResult = await pool.query(`${COMPONENTE_SELECT} ORDER BY rc.receta_id, rc.id`);
    const byReceta = new Map<number, any[]>();
    componentesResult.rows.forEach((row) => {
      const lista = byReceta.get(row.receta_id) ?? [];
      lista.push(row);
      byReceta.set(row.receta_id, lista);
    });

    res.json(recetas.map((receta) => ({ ...receta, componentes: byReceta.get(receta.id) ?? [] })));
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener recetas', details: error.message });
  }
};

export const getRecetaById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`${RECETA_SELECT} WHERE r.id = $1`, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Receta no encontrada' });
      return;
    }

    const componentes = await getComponentes(Number(id));
    res.json({ ...result.rows[0], componentes });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener receta', details: error.message });
  }
};

export const createReceta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawBody = req.body || {};
    const nombre = String(rawBody.nombre ?? '').trim();
    const producto_id = toNullableId(rawBody.producto_id ?? rawBody.productoId);
    const descripcion = rawBody.descripcion === undefined ? null : String(rawBody.descripcion ?? '').trim() || null;
    const cantidad_rinde = toNum(rawBody.cantidad_rinde ?? rawBody.cantidadRinde, 1);
    const unidad = rawBody.unidad === undefined || rawBody.unidad === null || rawBody.unidad === ''
      ? 'unidad'
      : String(rawBody.unidad).trim();
    const observaciones = rawBody.observaciones === undefined ? null : String(rawBody.observaciones ?? '').trim() || null;
    const activoRaw = rawBody.activo ?? rawBody.active ?? true;
    const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;

    if (!nombre) {
      res.status(400).json({
        error: 'Faltan campos requeridos',
        received: rawBody,
        detalle: 'Se requiere el nombre de la receta',
      });
      return;
    }

    if (cantidad_rinde <= 0) {
      res.status(400).json({ error: 'La cantidad que rinde debe ser mayor a cero' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO recetas (nombre, producto_id, descripcion, cantidad_rinde, unidad, observaciones, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [nombre, producto_id, descripcion, cantidad_rinde, unidad, observaciones, activo]
    );
    const recetaId = result.rows[0].id;

    const componentesRaw = Array.isArray(rawBody.componentes) ? rawBody.componentes : [];
    await guardarComponentes(recetaId, componentesRaw, unidad);

    const costoTotal = await recalcularCostoTotal(recetaId);
    const recetaResult = await pool.query(`${RECETA_SELECT} WHERE r.id = $1`, [recetaId]);
    const componentes = await getComponentes(recetaId);

    res.status(201).json({ ...recetaResult.rows[0], costo_total: costoTotal, componentes });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear receta', details: error.message });
  }
};

export const updateReceta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};

    const existe = await pool.query('SELECT id FROM recetas WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      res.status(404).json({ error: 'Receta no encontrada' });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (rawBody.nombre !== undefined) {
      const nombre = String(rawBody.nombre ?? '').trim();
      if (!nombre) {
        res.status(400).json({ error: 'El nombre de la receta no puede quedar vacío' });
        return;
      }
      params.push(nombre);
      updatable.push(`nombre = $${params.length}`);
    }

    const productoValue = rawBody.producto_id !== undefined ? rawBody.producto_id : rawBody.productoId;
    if (productoValue !== undefined) {
      params.push(toNullableId(productoValue));
      updatable.push(`producto_id = $${params.length}`);
    }

    if (rawBody.descripcion !== undefined) {
      params.push(String(rawBody.descripcion ?? '').trim() || null);
      updatable.push(`descripcion = $${params.length}`);
    }

    const rindeValue = rawBody.cantidad_rinde !== undefined ? rawBody.cantidad_rinde : rawBody.cantidadRinde;
    if (rindeValue !== undefined) {
      const cantidad_rinde = toNum(rindeValue, 1);
      if (cantidad_rinde <= 0) {
        res.status(400).json({ error: 'La cantidad que rinde debe ser mayor a cero' });
        return;
      }
      params.push(cantidad_rinde);
      updatable.push(`cantidad_rinde = $${params.length}`);
    }

    if (rawBody.unidad !== undefined) {
      params.push(String(rawBody.unidad ?? '').trim() || 'unidad');
      updatable.push(`unidad = $${params.length}`);
    }

    if (rawBody.observaciones !== undefined) {
      params.push(String(rawBody.observaciones ?? '').trim() || null);
      updatable.push(`observaciones = $${params.length}`);
    }

    const activoRaw = rawBody.activo ?? rawBody.active;
    if (activoRaw !== undefined) {
      const activo = activoRaw === 'false' || activoRaw === '0' || activoRaw === 0 || activoRaw === false ? false : true;
      params.push(activo);
      updatable.push(`activo = $${params.length}`);
    }

    if (updatable.length > 0) {
      updatable.push('updated_at = NOW()');
      params.push(id);
      await pool.query(`UPDATE recetas SET ${updatable.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (Array.isArray(rawBody.componentes)) {
      await pool.query('DELETE FROM receta_componentes WHERE receta_id = $1', [id]);
      await guardarComponentes(Number(id), rawBody.componentes, 'unidad');
    }

    const costoTotal = await recalcularCostoTotal(Number(id));
    const recetaResult = await pool.query(`${RECETA_SELECT} WHERE r.id = $1`, [id]);
    const componentes = await getComponentes(Number(id));

    res.json({ ...recetaResult.rows[0], costo_total: costoTotal, componentes });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar receta', details: error.message });
  }
};

export const deleteReceta = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recetas WHERE id = $1 RETURNING id, nombre', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Receta no encontrada' });
      return;
    }

    res.json({ message: 'Receta eliminada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar receta', details: error.message });
  }
};

export const addComponente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rawBody = req.body || {};

    const receta = await pool.query('SELECT id, unidad FROM recetas WHERE id = $1', [id]);
    if (receta.rows.length === 0) {
      res.status(404).json({ error: 'Receta no encontrada' });
      return;
    }

    const nombre = String(rawBody.nombre ?? '').trim();
    if (!nombre) {
      res.status(400).json({ error: 'Faltan campos requeridos', detalle: 'Se requiere el nombre del componente' });
      return;
    }

    const cantidad = toNum(rawBody.cantidad, 1);
    if (cantidad <= 0) {
      res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
      return;
    }

    const costoUnitario = await resolverCostoUnitario(rawBody);
    const unidad = rawBody.unidad ? String(rawBody.unidad).trim() : receta.rows[0].unidad || 'unidad';

    const result = await pool.query(
      `INSERT INTO receta_componentes (receta_id, producto_id, nombre, cantidad, unidad, costo_unitario, costo_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, receta_id, producto_id, nombre, cantidad, unidad, costo_unitario, costo_total, created_at, updated_at`,
      [
        Number(id),
        toNullableId(rawBody.producto_id ?? rawBody.productoId),
        nombre,
        cantidad,
        unidad,
        costoUnitario,
        round2(cantidad * costoUnitario),
      ]
    );

    const costoTotal = await recalcularCostoTotal(Number(id));
    res.status(201).json({ ...result.rows[0], receta_costo_total: costoTotal });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al agregar componente', details: error.message });
  }
};

export const updateComponente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, componenteId } = req.params;
    const rawBody = req.body || {};

    const actual = await pool.query('SELECT * FROM receta_componentes WHERE id = $1 AND receta_id = $2', [
      componenteId,
      id,
    ]);
    if (actual.rows.length === 0) {
      res.status(404).json({ error: 'Componente no encontrado' });
      return;
    }

    const updatable: string[] = [];
    const params: any[] = [];

    if (rawBody.nombre !== undefined) {
      const nombre = String(rawBody.nombre ?? '').trim();
      if (!nombre) {
        res.status(400).json({ error: 'El nombre del componente no puede quedar vacío' });
        return;
      }
      params.push(nombre);
      updatable.push(`nombre = $${params.length}`);
    }

    const productoValue = rawBody.producto_id !== undefined ? rawBody.producto_id : rawBody.productoId;
    if (productoValue !== undefined) {
      params.push(toNullableId(productoValue));
      updatable.push(`producto_id = $${params.length}`);
    }

    const cantidad = rawBody.cantidad !== undefined ? toNum(rawBody.cantidad, 1) : Number(actual.rows[0].cantidad);
    if (cantidad <= 0) {
      res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
      return;
    }
    params.push(cantidad);
    updatable.push(`cantidad = $${params.length}`);

    if (rawBody.unidad !== undefined) {
      params.push(String(rawBody.unidad ?? '').trim() || 'unidad');
      updatable.push(`unidad = $${params.length}`);
    }

    const costoUnitario = await resolverCostoUnitario({
      producto_id: productoValue !== undefined ? productoValue : actual.rows[0].producto_id,
      costo_unitario: rawBody.costo_unitario ?? rawBody.costoUnitario ?? actual.rows[0].costo_unitario,
    });
    params.push(costoUnitario);
    updatable.push(`costo_unitario = $${params.length}`);

    params.push(round2(cantidad * costoUnitario));
    updatable.push(`costo_total = $${params.length}`);

    updatable.push('updated_at = NOW()');
    params.push(componenteId, id);

    const result = await pool.query(
      `UPDATE receta_componentes SET ${updatable.join(', ')}
       WHERE id = $${params.length - 1} AND receta_id = $${params.length}
       RETURNING id, receta_id, producto_id, nombre, cantidad, unidad, costo_unitario, costo_total, created_at, updated_at`,
      params
    );

    const costoTotal = await recalcularCostoTotal(Number(id));
    res.json({ ...result.rows[0], receta_costo_total: costoTotal });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar componente', details: error.message });
  }
};

export const deleteComponente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, componenteId } = req.params;
    const result = await pool.query(
      'DELETE FROM receta_componentes WHERE id = $1 AND receta_id = $2 RETURNING id',
      [componenteId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Componente no encontrado' });
      return;
    }

    const costoTotal = await recalcularCostoTotal(Number(id));
    res.json({ message: 'Componente eliminado exitosamente', receta_costo_total: costoTotal });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar componente', details: error.message });
  }
};
