import { Router } from 'express';

import {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus
} from '../controllers/orderController.js';

import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', createOrder);
router.get('/', authMiddleware, adminMiddleware, listOrders);
router.get('/:id', authMiddleware, adminMiddleware, getOrderById);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

export default router;