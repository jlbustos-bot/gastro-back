import { Router } from 'express';
import { ventaDiaria } from '../controllers/reporteController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/venta-diaria', verifyToken, authorize('admin', 'manager'), ventaDiaria);

export default router;