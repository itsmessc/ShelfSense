import { Router } from 'express';
import * as ctrl from '../controllers/analyticsController.js';

const router = Router();

router.get('/', ctrl.getAnalyticsData);

export default router;
