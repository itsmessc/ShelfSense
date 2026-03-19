import { Router } from 'express';
import * as ctrl from '../controllers/usageController.js';

const router = Router();

router.get ('/',          ctrl.getRecentLogs);
router.post('/batch',     ctrl.batchLogUsage);
router.post('/',          ctrl.logUsage);
router.get ('/:itemId',   ctrl.getUsageHistory);

export default router;
