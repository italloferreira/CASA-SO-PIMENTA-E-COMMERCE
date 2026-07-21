import { Router } from 'express';
import {
  getAuthUrl,
  handleCallback,
  getStatus,
  disconnect
} from '../controllers/melhorEnvioController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/auth', authMiddleware, adminMiddleware, getAuthUrl);
router.get('/status', authMiddleware, adminMiddleware, getStatus);
router.post('/disconnect', authMiddleware, adminMiddleware, disconnect);
router.get('/callback', handleCallback);

export default router;
