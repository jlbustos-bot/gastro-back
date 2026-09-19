import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, Order, OrderItem } from '../types';

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurant_id, status } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params: any[] = [];

    if (restaurant_id) {
      query += ' AND restaurant_id = $' + (params.length + 1);
      params.push(restaurant_id);
    }

    if (status) {
      query += ' AND status = $' + (params.length + 1);
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener órdenes', details: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener orden', details: error.message });
  }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurant_id, table_number, items } = req.body;

    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Restaurante e items requeridos' });
      return;
    }

    // Calcular total
    let totalPrice = 0;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const item of items) {
        const dishResult = await client.query('SELECT price FROM dishes WHERE id = $1', [item.dish_id]);
        if (dishResult.rows.length === 0) {
          throw new Error(`Plato ${item.dish_id} no encontrado`);
        }
        totalPrice += dishResult.rows[0].price * item.quantity;
      }

      // Crear orden
      const orderResult = await client.query(
        'INSERT INTO orders (restaurant_id, user_id, table_number, status, total_price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [restaurant_id, req.user?.id || null, table_number, 'pending', totalPrice]
      );

      const order = orderResult.rows[0];

      // Crear items de la orden
      for (const item of items) {
        const dishResult = await client.query('SELECT price FROM dishes WHERE id = $1', [item.dish_id]);
        await client.query(
          'INSERT INTO order_items (order_id, dish_id, quantity, price, notes) VALUES ($1, $2, $3, $4, $5)',
          [order.id, item.dish_id, item.quantity, dishResult.rows[0].price, item.notes]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Orden creada exitosamente',
        order,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear orden', details: error.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Estado requerido' });
      return;
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar orden', details: error.message });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
      const result = await client.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Orden no encontrada' });
        return;
      }

      await client.query('COMMIT');
      res.json({ message: 'Orden eliminada exitosamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar orden', details: error.message });
  }
};
