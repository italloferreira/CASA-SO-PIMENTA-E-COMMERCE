import { Router } from 'express';

import {
  createOrder,
  listOrders,
  getOrderById,
  getMyOrders,
  getMyOrderById,
  updateOrderStatus,
  confirmPickup,
  cancelMyOrder
} from '../controllers/orderController.js';

import { calculateShipping } from '../controllers/shippingController.js';

import { authMiddleware, adminMiddleware, optionalAuth } from '../middlewares/authMiddleware.js';
import { orderLimiter, shippingLimiter, pickupLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/', optionalAuth, orderLimiter, createOrder);
router.get('/my', authMiddleware, getMyOrders);
router.get('/my/:id', authMiddleware, getMyOrderById);
router.get('/', authMiddleware, adminMiddleware, listOrders);
router.get('/:id', authMiddleware, adminMiddleware, getOrderById);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);
router.post('/:id/confirm-pickup', authMiddleware, adminMiddleware, pickupLimiter, confirmPickup);
router.post('/:id/cancel', authMiddleware, cancelMyOrder);

router.post('/calculate-shipping', authMiddleware, shippingLimiter, calculateShipping);

export default router;
