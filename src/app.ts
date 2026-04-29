import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes.js';
import userReportRoutes from './routes/report.routes.js';

dotenv.config({ path: '.env' });

const app = express();

app.set('trust proxy', true);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/*
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || /\.lokeshwardewangan\.in$/.test(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
*/

app.use(express.json({ limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

interface WelcomeResponseBody {
    message: string;
}

const getWelcomeHandler = (
    _req: Request<Record<string, never>, WelcomeResponseBody, Record<string, never>>,
    res: Response<WelcomeResponseBody>,
): void => {
    res.json({ message: 'Welcome to Budgetter API' });
};

// Welcome route
app.get('/', getWelcomeHandler);

// Api EndPoints
app.use('/api/user', userRoutes);
app.use('/api/user/report', userReportRoutes);

export { app };
