import { Router } from 'express';
import * as ctrl from '../controllers/itemController.js';

const router = Router();

router.get   ('/expiry-calendar', ctrl.getExpiryCalendar);
router.get   ('/export',          ctrl.exportItems);
router.post  ('/import',          ctrl.importItems);
router.post  ('/scan-shelf',      ctrl.scanShelf);
router.get   ('/',                ctrl.listItems);
router.post  ('/',                ctrl.createItem);
router.get   ('/:id',             ctrl.getItem);
router.put   ('/:id',             ctrl.updateItem);
router.delete('/:id',             ctrl.deleteItem);

export default router;
