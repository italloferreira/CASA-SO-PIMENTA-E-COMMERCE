import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController.js';

const router = Router();

router.get('/', listBanners);
router.post('/', authMiddleware, adminMiddleware, createBanner);
router.put('/:id', authMiddleware, adminMiddleware, updateBanner);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBanner);

export default router;