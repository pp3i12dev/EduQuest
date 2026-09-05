import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

app.use('/api/dashboard', dashboardRoutes);

export default app;