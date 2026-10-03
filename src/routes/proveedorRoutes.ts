import { Router } from 'express';
import { getAllProveedores, getProveedorById, createProveedor, updateProveedor, deleteProveedor } from '../controllers/proveedorController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllProveedores);
router.get('/:id', getProveedorById);
router.post('/', verifyToken, authorize('admin', 'manager'), createProveedor);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateProveedor);
router.delete('/:id', verifyToken, authorize('admin'), deleteProveedor);

export default router;