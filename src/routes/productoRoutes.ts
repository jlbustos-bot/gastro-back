import { Router } from 'express';
import { getAllProductos, getProductoById, createProducto, updateProducto, deleteProducto } from '../controllers/productoController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllProductos);
router.get('/:id', getProductoById);
router.post('/', verifyToken, authorize('admin', 'manager'), createProducto);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateProducto);
router.delete('/:id', verifyToken, authorize('admin'), deleteProducto);

export default router;
