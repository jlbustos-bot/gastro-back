import { Router } from 'express';
import { getAllClientes, getClienteById, createCliente, updateCliente, deleteCliente } from '../controllers/clienteController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllClientes);
router.get('/:id', getClienteById);
router.post('/', verifyToken, authorize('admin', 'manager'), createCliente);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateCliente);
router.delete('/:id', verifyToken, authorize('admin'), deleteCliente);

export default router;