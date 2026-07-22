import { Router } from 'express';
import { listUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { adminLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, adminLimiter, listUsers);
router.get('/:id', authMiddleware, adminMiddleware, adminLimiter, getUserById);
router.put('/:id', authMiddleware, adminMiddleware, adminLimiter, updateUser);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, deleteUser);

export default router;
