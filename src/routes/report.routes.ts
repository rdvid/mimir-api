import { Router } from 'express';
import verifyJwtToken from '../middleware/auth.middleware.js';
import { TotalExpensesAndAddedMoneyOfMonth } from '../controllers/reports.controllers.js';

const router = Router();

router
    .route('/total-expenses-and-added-money-in-month')
    .post(verifyJwtToken, TotalExpensesAndAddedMoneyOfMonth);

export default router;
