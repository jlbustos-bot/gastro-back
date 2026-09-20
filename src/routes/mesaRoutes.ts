import { Router } from 'express';
import { getAllMesas, getMesaById, createMesa, updateMesa, deleteMesa } from '../controllers/mesaController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllMesas);
router.get('/:id', getMesaById);
router.post('/', verifyToken, authorize('admin', 'manager'), createMesa);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateMesa);
router.delete('/:id', verifyToken, authorize('admin'), deleteMesa);

export default router;