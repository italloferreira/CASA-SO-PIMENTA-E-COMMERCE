import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { paymentLimiter } from '../middlewares/rateLimiter.js';
import {
  processCard,
  processPix,
  handleWebhook,
  getPaymentStatus,
  getMpPublicKey
} from '../controllers/paymentController.js';

const router = Router();

router.post('/process-card', authMiddleware, paymentLimiter, processCard);
router.post('/process-pix', authMiddleware, paymentLimiter, processPix);
router.post('/webhook', handleWebhook);
router.get('/status/:paymentId', authMiddleware, getPaymentStatus);

export default router;
