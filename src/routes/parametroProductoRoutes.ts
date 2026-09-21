import { Router } from 'express';
import { getAllParametrosProductos, getParametroProductoById, createParametroProducto, updateParametroProducto, deleteParametroProducto } from '../controllers/parametroProductoController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllParametrosProductos);
router.get('/:id', getParametroProductoById);
router.post('/', verifyToken, authorize('admin', 'manager'), createParametroProducto);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateParametroProducto);
router.delete('/:id', verifyToken, authorize('admin'), deleteParametroProducto);

export default router;