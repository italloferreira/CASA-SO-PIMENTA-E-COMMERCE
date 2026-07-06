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

const router = Router();

router.get('/', authMiddleware, adminMiddleware, listCoupons);
router.get('/:id', authMiddleware, adminMiddleware, getCouponById);
router.post('/', authMiddleware, adminMiddleware, createCoupon);
router.put('/:id', authMiddleware, adminMiddleware, updateCoupon);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCoupon);

router.post('/validate', authMiddleware, validateCoupon);

export default router;
