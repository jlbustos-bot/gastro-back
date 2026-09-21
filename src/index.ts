import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/authRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import productoRoutes from './routes/productoRoutes';
import grupo1prodRoutes from './routes/grupo1prodRoutes';
import grupo2prodRoutes from './routes/grupo2prodRoutes';
import clienteRoutes from './routes/clienteRoutes';
import mesaRoutes from './routes/mesaRoutes';
import consumoRoutes from './routes/consumoRoutes';
import medioPagoRoutes from './routes/medioPagoRoutes';
import reporteRoutes from './routes/reporteRoutes';
import proveedorRoutes from './routes/proveedorRoutes';
import productoProveedorRoutes from './routes/productoProveedorRoutes';
import parametroProductoRoutes from './routes/parametroProductoRoutes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend operativo' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/grupo1prod', grupo1prodRoutes);
app.use('/api/grupo2prod', grupo2prodRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/consumos', consumoRoutes);
app.use('/api/medios-pago', medioPagoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/producto-proveedor', productoProveedorRoutes);
app.use('/api/parametros-productos', parametroProductoRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});

export default app;
