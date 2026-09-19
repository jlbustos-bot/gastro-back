import { Router } from 'express';
import { getAllGrupo1Prod, getGrupo1ProdById, createGrupo1Prod, updateGrupo1Prod, deleteGrupo1Prod } from '../controllers/grupo1prodController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllGrupo1Prod);
router.get('/:id', getGrupo1ProdById);
router.post('/', verifyToken, authorize('admin', 'manager'), createGrupo1Prod);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateGrupo1Prod);
router.delete('/:id', verifyToken, authorize('admin'), deleteGrupo1Prod);

export default router;
