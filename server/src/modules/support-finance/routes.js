import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ module: 'support-finance', status: 'ready' });
});

export default router;
