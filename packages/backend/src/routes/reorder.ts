import { Router } from 'express';
import * as ctrl from '../controllers/reorderController.js';

const router = Router();

router.get('/', ctrl.getQueue);

export default router;
