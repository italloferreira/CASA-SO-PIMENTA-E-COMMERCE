import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

import {
  listKits,
  getKitById,
  createKit,
  updateKit,
  addKitItem,
  deleteKitItems,
  deleteKit
} from '../controllers/kitController.js';

const router = Router();

router.get('/', listKits);
router.get('/:id', getKitById);
router.post('/', authMiddleware, adminMiddleware, createKit);
router.put('/:id', authMiddleware, adminMiddleware, updateKit);
router.post('/:id/items', authMiddleware, adminMiddleware, addKitItem);
router.delete('/:id/items', authMiddleware, adminMiddleware, deleteKitItems);
router.delete('/:id', authMiddleware, adminMiddleware, deleteKit);

export default router;