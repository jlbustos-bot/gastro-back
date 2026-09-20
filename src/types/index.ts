import { Request, Response } from 'express';

export interface User {
  id?: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'chef' | 'waiter';
  created_at?: Date;
}

export interface Restaurant {
  id?: number;
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  created_at?: Date;
}

export interface Menu {
  id?: number;
  restaurant_id: number;
  name: string;
  description?: string;
  active: boolean;
  created_at?: Date;
}

export interface Dish {
  id?: number;
  menu_id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  preparation_time?: number;
  created_at?: Date;
}

export interface Order {
  id?: number;
  restaurant_id: number;
  user_id: number;
  table_number?: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_price: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface OrderItem {
  id?: number;
  order_id: number;
  dish_id: number;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Inventory {
  id?: number;
  restaurant_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Producto {
  id?: number;
  nombre: string;
  nombrecorto: string;
  grupo1prod?: number | null;
  grupo2prod?: number | null;
  precioventa: number;
  activo: boolean;
}

export interface Grupo1Prod {
  id?: number;
  nombre: string;
  activo: boolean;
}

export interface Grupo2Prod {
  id?: number;
  nombre: string;
  activo: boolean;
}

export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Mesa {
  id?: number;
  numero: number;
  capacidad: number;
  ubicacion?: string;
  estado: 'libre' | 'ocupada' | 'reservada' | 'inactiva';
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ConsumoItem {
  id?: number;
  consumo_id?: number;
  producto_id: number;
  cantidad: number;
  precio: number;
  producto_nombre?: string;
}

export interface Consumo {
  id?: number;
  mesa_id: number;
  cliente_id?: number | null;
  estado: 'abierta' | 'pagada' | 'anulada';
  total: number;
  created_at?: Date;
  updated_at?: Date;
  mesa_numero?: number;
  cliente_nombre?: string;
  items?: ConsumoItem[];
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export interface AuthResponse {
  message?: string;
  user?: any;
  token?: string;
  error?: string;
}
