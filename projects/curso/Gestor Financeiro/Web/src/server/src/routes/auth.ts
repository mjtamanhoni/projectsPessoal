import {Router} from 'express';
const router = Router();
router.post('/login', (_req, res) => {
  res.json({message: 'Rota de login -a se implementada'});
});
export default router;