import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import invitationsRoutes from './routes/invitations.routes.js';
import publicRoutes from './routes/public.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api', apiRouter);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/public', publicRoutes);


export default app;