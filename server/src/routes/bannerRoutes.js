import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { adminLimiter } from '../middlewares/rateLimiter.js';

import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController.js';

const router = Router();

router.get('/', listBanners);
router.post('/', authMiddleware, adminMiddleware, adminLimiter, createBanner);
router.put('/:id', authMiddleware, adminMiddleware, adminLimiter, updateBanner);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, deleteBanner);

export default router;