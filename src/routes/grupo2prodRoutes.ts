import { Router } from 'express';
import {
  getAllGrupo2Prod,
  getGrupo2ProdById,
  createGrupo2Prod,
  updateGrupo2Prod,
  deleteGrupo2Prod,
} from '../controllers/grupo2prodController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllGrupo2Prod);
router.get('/:id', getGrupo2ProdById);
router.post('/', verifyToken, authorize('admin', 'manager'), createGrupo2Prod);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateGrupo2Prod);
router.delete('/:id', verifyToken, authorize('admin'), deleteGrupo2Prod);

export default router;
