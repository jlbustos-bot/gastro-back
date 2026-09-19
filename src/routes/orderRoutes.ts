import { Router } from 'express';
import { getAllOrders, getOrderById, createOrder, updateOrderStatus, deleteOrder } from '../controllers/orderController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getAllOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/', verifyToken, createOrder);
router.put('/:id', verifyToken, authorize('admin', 'manager', 'chef'), updateOrderStatus);
router.delete('/:id', verifyToken, authorize('admin', 'manager'), deleteOrder);

export default router;
