import { Router } from 'express';
import { getAllDishes, getDishById, createDish, updateDish, deleteDish } from '../controllers/dishController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllDishes);
router.get('/:id', getDishById);
router.post('/', verifyToken, authorize('admin', 'manager', 'chef'), createDish);
router.put('/:id', verifyToken, authorize('admin', 'manager', 'chef'), updateDish);
router.delete('/:id', verifyToken, authorize('admin', 'manager'), deleteDish);

export default router;
