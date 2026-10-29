import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { getTrueFalse, postTrueFalseResults } from '../controllers/game.controller.js';

// Montar en routes/index.js:
//   import gameRoutes from './game.routes.js';
//   router.use('/games', gameRoutes);
//
// GET  /api/games/true-false/:activityId          -> 10 afirmaciones aleatorias
// POST /api/games/true-false/:activityId/results  -> corrige, guarda GameAttempt y devuelve el puntaje

const router = Router();
router.use(authenticate, requirePermission('game:play')); // 'game:play' ya existe en permissions.js (STUDENT)

router.get('/true-false/:activityId', getTrueFalse);
router.post('/true-false/:activityId/results', postTrueFalseResults);

export default router;
