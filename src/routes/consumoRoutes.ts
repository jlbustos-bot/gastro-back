import { Router } from 'express';
import { getAllConsumos, getConsumoById, createConsumo, updateConsumo, deleteConsumo } from '../controllers/consumoController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllConsumos);
router.get('/:id', getConsumoById);
router.post('/', verifyToken, authorize('admin', 'manager', 'waiter'), createConsumo);
router.put('/:id', verifyToken, authorize('admin', 'manager', 'waiter'), updateConsumo);
router.delete('/:id', verifyToken, authorize('admin'), deleteConsumo);

export default router;