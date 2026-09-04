import { Router } from 'express';
import { newsController } from '../controllers/newsController.js';

const router = Router();

router.get('/', (req, res, next) => newsController.getNews(req, res, next));
router.get('/:id', (req, res, next) => newsController.getNewsById(req, res, next));

export default router;
