import { Router } from 'express';
import { getAllMediosPago, getMedioPagoById, createMedioPago, updateMedioPago, deleteMedioPago } from '../controllers/medioPagoController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllMediosPago);
router.get('/:id', getMedioPagoById);
router.post('/', verifyToken, authorize('admin', 'manager'), createMedioPago);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateMedioPago);
router.delete('/:id', verifyToken, authorize('admin'), deleteMedioPago);

export default router;