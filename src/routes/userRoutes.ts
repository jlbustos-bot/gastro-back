import { Router } from 'express';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/userController';
import { verifyToken, authorize } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken, getAllUsers);
router.get('/:id', verifyToken, getUserById);
router.post('/', verifyToken, authorize('admin', 'manager'), createUser);
router.put('/:id', verifyToken, authorize('admin', 'manager'), updateUser);
router.delete('/:id', verifyToken, authorize('admin'), deleteUser);

export default router;