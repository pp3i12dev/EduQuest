
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRouter from './routes/index.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import invitationsRoutes from './routes/invitations.routes.js';
import publicRoutes from './routes/public.routes.js';
import earlyNoticeRoutes from './routes/earlyNotice.routes.js';
import institutionCommunicationRoutes from './routes/institutionCommunication.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '../uploads'))
);

app.use('/api', apiRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/public', publicRoutes);

// Avisos Tempranos
app.use('/api/early-notices', earlyNoticeRoutes);
app.use('/api/institution-communications', institutionCommunicationRoutes);

export default app;
