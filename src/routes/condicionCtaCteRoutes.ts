import { Router } from 'express';
import { getAllCondicionesCtaCte, getCondicionCtaCteById, createCondicionCtaCte, updateCondicionCtaCte, deleteCondicionCtaCte } from '../controllers/condicionCtaCteController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllCondicionesCtaCte);
router.get('/:id', getCondicionCtaCteById);
router.post('/', verifyToken, authorize('admin', 'manager'), createCondicionCtaCte);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateCondicionCtaCte);
router.delete('/:id', verifyToken, authorize('admin'), deleteCondicionCtaCte);

export default router;