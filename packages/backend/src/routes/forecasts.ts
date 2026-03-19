import { Router } from 'express';
import * as ctrl from '../controllers/forecastController.js';

const router = Router();

router.post('/generate', ctrl.generate);

export default router;
