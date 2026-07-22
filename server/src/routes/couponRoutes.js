import { Router } from 'express';
import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} from '../controllers/couponController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { adminLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, adminLimiter, listCoupons);
router.get('/:id', authMiddleware, adminMiddleware, adminLimiter, getCouponById);
router.post('/', authMiddleware, adminMiddleware, adminLimiter, createCoupon);
router.put('/:id', authMiddleware, adminMiddleware, adminLimiter, updateCoupon);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, deleteCoupon);

router.post('/validate', authMiddleware, validateCoupon);

export default router;
