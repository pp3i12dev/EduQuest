import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { assertAdmin } from '../services/serviceConfig.service.js';
import * as controller from '../controllers/serviceConfig.controller.js';
const router = Router();
router.use(authenticate);
router.use((req, res, next) => {
  try { assertAdmin(req.user); next(); }
  catch (e) { res.status(e.status || 403).json({ message: e.message }); }
});
router.get('/', controller.summary);
router.put('/smtp', controller.saveSmtp);
router.post('/smtp/test', controller.testSmtp);
router.put('/gemini', controller.saveGemini);
router.post('/gemini/test', controller.testGemini);
router.post('/push/generate', controller.generatePush);
router.post('/push/regenerate', controller.regeneratePush);
router.put('/push', controller.togglePush);
export default router;
