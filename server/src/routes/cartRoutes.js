import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeGuestCart
} from '../controllers/cartController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, getCart);
router.post('/items', optionalAuth, addItem);
router.put('/items/:id', optionalAuth, updateItem);
router.delete('/items/:id', optionalAuth, removeItem);
router.delete('/clear', optionalAuth, clearCart);
router.post('/merge', optionalAuth, mergeGuestCart);

export default router;
