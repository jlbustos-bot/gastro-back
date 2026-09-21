import { Router } from 'express';
import { getAllProductoProveedor, getProductoProveedorById, createProductoProveedor, updateProductoProveedor, deleteProductoProveedor } from '../controllers/productoProveedorController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllProductoProveedor);
router.get('/:id', getProductoProveedorById);
router.post('/', verifyToken, authorize('admin', 'manager'), createProductoProveedor);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateProductoProveedor);
router.delete('/:id', verifyToken, authorize('admin'), deleteProductoProveedor);

export default router;