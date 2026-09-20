import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import summaryRoutes from './routes/summary.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import { setupSwagger } from './swagger/setup.js';
import { ApiError } from './utils/ApiError.js';
const app = express();
app.set('trust proxy', true);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.static('public'));
const getWelcomeHandler = (_req, res) => {
    res.json({ message: 'Welcome to Mimir API' });
};
app.get('/', getWelcomeHandler);
setupSwagger(app);
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/summary', summaryRoutes);
app.use('/categories', categoryRoutes);
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            statusCode: err.statusCode,
            data: err.data,
            message: err.message,
            success: false,
            errors: err.errors,
        });
        return;
    }
    console.error(err);
    res.status(500).json({
        statusCode: 500,
        data: null,
        message: 'Internal Server Error',
        success: false,
        errors: [],
    });
};
app.use(errorHandler);
export { app };
