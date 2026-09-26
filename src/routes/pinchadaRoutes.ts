import { Router } from 'express';
import { getAllPinchadas, getPinchadaById, createPinchada, updatePinchada, deletePinchada } from '../controllers/pinchadaController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllPinchadas);
router.get('/:id', getPinchadaById);
router.post('/', verifyToken, authorize('admin', 'manager'), createPinchada);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updatePinchada);
router.delete('/:id', verifyToken, authorize('admin'), deletePinchada);

export default router;