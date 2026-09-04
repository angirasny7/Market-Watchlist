import { Router } from 'express';
import { stockController } from '../controllers/stockController.js';

const router = Router();

router.get('/', (req, res, next) => stockController.getAllStocks(req, res, next));
router.get('/:symbol', (req, res, next) => stockController.getStockBySymbol(req, res, next));

export default router;
