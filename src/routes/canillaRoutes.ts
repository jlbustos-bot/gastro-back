import { Router } from 'express';
import { getAllCanillas, getCanillaById, createCanilla, updateCanilla, deleteCanilla } from '../controllers/canillaController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllCanillas);
router.get('/:id', getCanillaById);
router.post('/', verifyToken, authorize('admin', 'manager'), createCanilla);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateCanilla);
router.delete('/:id', verifyToken, authorize('admin'), deleteCanilla);

export default router;