import { Router } from 'express';

import {
  createOrder,
  listOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  confirmPickup
} from '../controllers/orderController.js';

import { calculateShipping } from '../controllers/shippingController.js';

import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { orderLimiter, shippingLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/', orderLimiter, createOrder);
router.get('/my', authMiddleware, getMyOrders);
router.get('/', authMiddleware, adminMiddleware, listOrders);
router.get('/:id', authMiddleware, adminMiddleware, getOrderById);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);
router.post('/:id/confirm-pickup', authMiddleware, adminMiddleware, confirmPickup);

router.post('/calculate-shipping', authMiddleware, shippingLimiter, calculateShipping);

export default router;
