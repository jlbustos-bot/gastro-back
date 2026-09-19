import { Router } from 'express';
import { getAllRestaurants, getRestaurantById, createRestaurant, updateRestaurant, deleteRestaurant } from '../controllers/restaurantController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getAllRestaurants);
router.get('/:id', getRestaurantById);
router.post('/', verifyToken, authorize('admin', 'manager'), createRestaurant);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateRestaurant);
router.delete('/:id', verifyToken, authorize('admin'), deleteRestaurant);

export default router;
