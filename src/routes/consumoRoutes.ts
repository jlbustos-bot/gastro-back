import { Router } from 'express';
import { getAllConsumos, getConsumoById, createConsumo, updateConsumo, deleteConsumo, payConsumo } from '../controllers/consumoController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllConsumos);
router.get('/:id', getConsumoById);
router.post('/', verifyToken, authorize('admin', 'manager', 'waiter'), createConsumo);
router.post('/:id/pagar', verifyToken, authorize('admin', 'manager', 'waiter'), payConsumo);
router.put('/:id', verifyToken, authorize('admin', 'manager', 'waiter'), updateConsumo);
router.delete('/:id', verifyToken, authorize('admin'), deleteConsumo);

export default router;