import { Router } from 'express';
import * as ctrl from '../controllers/procurementController.js';

const router = Router();

router.get('/suggestions', ctrl.getSuggestions);

export default router;
