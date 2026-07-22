import { Router } from 'express';
import {
  listKits,
  getKitById,
  getKitsStatus,
  createKit,
  updateKit,
  addKitItem,
  deleteKitItems,
  deleteKit
} from '../controllers/kitController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';
import { adminLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.get('/status', getKitsStatus);
router.get('/', listKits);
router.get('/:id', getKitById);
router.post('/', authMiddleware, adminMiddleware, adminLimiter, createKit);
router.put('/:id', authMiddleware, adminMiddleware, adminLimiter, updateKit);
router.post('/:id/items', authMiddleware, adminMiddleware, adminLimiter, addKitItem);
router.delete('/:id/items', authMiddleware, adminMiddleware, adminLimiter, deleteKitItems);
router.delete('/:id', authMiddleware, adminMiddleware, adminLimiter, deleteKit);

export default router;
