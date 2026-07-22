import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { adminLimiter } from '../middlewares/rateLimiter.js';

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = Router();

router.get('/', listCategories);
router.post('/', authMiddleware, adminMiddleware, adminLimiter, createCategory);
router.put('/:id', authMiddleware, adminMiddleware, adminLimiter, updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, deleteCategory);

export default router;