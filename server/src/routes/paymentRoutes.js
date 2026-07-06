import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  processCard,
  processPix,
  handleWebhook,
  getPaymentStatus,
  getMpPublicKey
} from '../controllers/paymentController.js';

const router = Router();

router.post('/process-card', authMiddleware, processCard);
router.post('/process-pix', authMiddleware, processPix);
router.post('/webhook', handleWebhook);
router.get('/status/:paymentId', authMiddleware, getPaymentStatus);

export default router;
