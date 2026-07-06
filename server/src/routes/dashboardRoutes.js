import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, adminMiddleware, getDashboard);

export default router;
