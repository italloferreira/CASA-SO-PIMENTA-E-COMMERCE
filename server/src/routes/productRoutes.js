import { Router } from 'express';
import { authMiddleware, adminMiddleware, optionalAuth } from '../middlewares/authMiddleware.js';

import {
  listProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsStatus
} from '../controllers/productController.js';

const router = Router();

router.get('/', optionalAuth, listProducts);
router.get('/search', searchProducts);
router.get('/status', getProductsStatus);
router.get('/:id', getProductById);
router.post('/', authMiddleware, adminMiddleware, createProduct);
router.put('/:id', authMiddleware, adminMiddleware, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export default router;