import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getFechaCajaHoy = (): string => {
  const now = new Date();
  const cajaDate = new Date(now);
  if (now.getHours() < 8) {
    cajaDate.setDate(cajaDate.getDate() - 1);
  }
  return toDateString(cajaDate);
};

export const ventaDiaria = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fecha } = req.query;
    const fechaCaja = fecha ? String(fecha) : getFechaCajaHoy();

    const mediosResult = await pool.query(
      `
      WITH pagos AS (
        SELECT cp.medio_pago_id, cp.monto
        FROM consumo_pagos cp
        JOIN consumos c ON c.id = cp.consumo_id
        WHERE c.fecha_caja = $1 AND c.estado = 'pagada'
        UNION ALL
        SELECT c.medio_pago_id, c.total
        FROM consumos c
        WHERE c.fecha_caja = $1
          AND c.estado = 'pagada'
          AND c.medio_pago_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM consumo_pagos x WHERE x.consumo_id = c.id)
      )
      SELECT mp.id AS medio_pago_id, mp.nombre,
             COALESCE(mp.orden, 2147483647) AS orden,
             ROUND(COALESCE(SUM(p.monto), 0)::numeric, 2) AS total,
             COUNT(*) AS cantidad
      FROM pagos p
      JOIN medios_pago mp ON mp.id = p.medio_pago_id
      GROUP BY mp.id, mp.nombre, mp.orden
      ORDER BY COALESCE(mp.orden, 2147483647), mp.nombre
      `,
      [fechaCaja]
    );

    const totalResult = await pool.query(
      `
      SELECT ROUND(COALESCE(SUM(p.monto), 0)::numeric, 2) AS total_general,
             COUNT(DISTINCT p.consumo_id) AS cantidad_consumos
      FROM (
        SELECT cp.consumo_id, cp.monto
        FROM consumo_pagos cp
        JOIN consumos c ON c.id = cp.consumo_id
        WHERE c.fecha_caja = $1 AND c.estado = 'pagada'
        UNION ALL
        SELECT c.id, c.total
        FROM consumos c
        WHERE c.fecha_caja = $1
          AND c.estado = 'pagada'
          AND c.medio_pago_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM consumo_pagos x WHERE x.consumo_id = c.id)
      ) p
      `,
      [fechaCaja]
    );

    const consumosResult = await pool.query(
      `
      SELECT c.id, m.numero AS mesa_numero,
             CONCAT(cl.nombre, ' ', cl.apellido) AS cliente_nombre,
             c.total,
             (SELECT string_agg(mp.nombre, ', ' ORDER BY cp.id)
              FROM consumo_pagos cp
              JOIN medios_pago mp ON mp.id = cp.medio_pago_id
              WHERE cp.consumo_id = c.id) AS medio_pago_nombre,
             c.created_at
      FROM consumos c
      LEFT JOIN mesas m ON m.id = c.mesa_id
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      WHERE c.fecha_caja = $1 AND c.estado = 'pagada'
      ORDER BY c.created_at
      `,
      [fechaCaja]
    );

    res.json({
      fecha_caja: fechaCaja,
      medios: mediosResult.rows.map((r) => ({
        medio_pago_id: r.medio_pago_id,
        nombre: r.nombre,
        orden: r.orden === 2147483647 ? null : r.orden,
        total: Number(r.total),
        cantidad: Number(r.cantidad),
      })),
      total_general: Number(totalResult.rows[0]?.total_general ?? 0),
      cantidad_consumos: Number(totalResult.rows[0]?.cantidad_consumos ?? 0),
      consumos: consumosResult.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al generar el reporte de venta diaria', details: error.message });
  }
};