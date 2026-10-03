import { Router } from 'express';
import {
  getAllRecetas,
  getRecetaById,
  createReceta,
  updateReceta,
  deleteReceta,
  addComponente,
  updateComponente,
  deleteComponente,
} from '../controllers/recetaController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllRecetas);
router.get('/:id', getRecetaById);
router.post('/', verifyToken, authorize('admin', 'manager'), createReceta);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateReceta);
router.delete('/:id', verifyToken, authorize('admin'), deleteReceta);
router.post('/:id/componentes', verifyToken, authorize('admin', 'manager'), addComponente);
router.put('/:id/componentes/:componenteId', verifyToken, authorize('admin', 'manager'), updateComponente);
router.delete('/:id/componentes/:componenteId', verifyToken, authorize('admin', 'manager'), deleteComponente);

export default router;
