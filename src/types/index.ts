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
  logo?: string;
  created_at?: Date;
}

export interface Producto {
  id?: number;
  nombre: string;
  nombrecorto: string;
  grupo1prod?: number | null;
  grupo2prod?: number | null;
  proveedor_id?: number | null;
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

export interface MedioPago {
  id?: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Proveedor {
  id?: number;
  nombre: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  observaciones?: string;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProductoProveedor {
  id?: number;
  producto_id: number;
  proveedor_id: number;
  precio_por_litro: number;
  precio_barril: number;
  precio_venta_sugerido: number;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
  producto_nombre?: string;
  proveedor_nombre?: string;
}

export interface ParametroProducto {
  id?: number;
  cantidad_barril_cerveza: number;
  coeficiente_precio_venta: number;
  activo: boolean;
  created_at?: Date;
  updated_at?: Date;
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
