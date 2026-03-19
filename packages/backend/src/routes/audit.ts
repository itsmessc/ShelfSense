import { Router } from 'express';
import * as ctrl from '../controllers/auditController.js';

const router = Router();

router.get('/', ctrl.getAuditLog);

export default router;
