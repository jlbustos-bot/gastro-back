import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/authRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import dishRoutes from './routes/dishRoutes';
import orderRoutes from './routes/orderRoutes';
import grupo1prodRoutes from './routes/grupo1prodRoutes';

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
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/grupo1prod', grupo1prodRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});

export default app;
