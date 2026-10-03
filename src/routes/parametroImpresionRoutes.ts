import { Router } from 'express';
import { getAllParametrosImpresion, getParametroImpresionById, createParametroImpresion, updateParametroImpresion, deleteParametroImpresion } from '../controllers/parametroImpresionController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllParametrosImpresion);
router.get('/:id', getParametroImpresionById);
router.post('/', verifyToken, authorize('admin', 'manager'), createParametroImpresion);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateParametroImpresion);
router.delete('/:id', verifyToken, authorize('admin'), deleteParametroImpresion);

export default router;