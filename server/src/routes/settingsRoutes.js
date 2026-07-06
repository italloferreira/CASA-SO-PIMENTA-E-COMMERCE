import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', getSettings);
router.put('/', authMiddleware, adminMiddleware, updateSettings);

export default router;
