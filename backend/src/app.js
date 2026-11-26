
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Usar siempre backend/.env independientemente de la carpeta desde donde se inicia Node.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

import express from 'express';
import cors from 'cors';
import path from 'path';
import { timingSafeEqual } from 'node:crypto';
import { processWebPushQueue } from './services/webPush.service.js';

import apiRouter from './routes/index.js';
import studentRoutes from './routes/student.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import invitationsRoutes from './routes/invitations.routes.js';
import publicRoutes from './routes/public.routes.js';
import earlyNoticeRoutes from './routes/earlyNotice.routes.js';
import institutionCommunicationRoutes from './routes/institutionCommunication.routes.js';

const app = express();

// CORS no reemplaza JWT; limita qué sitios pueden invocar la API desde navegadores.
// Unity/Android y herramientas servidor-a-servidor no suelen enviar Origin.
const allowedBrowserOrigins = new Set([
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
].filter(Boolean).map(v => v.trim().replace(/\/$/, '')));
if (process.env.NODE_ENV !== 'production') {
    ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'].forEach(origin => allowedBrowserOrigins.add(origin));
}
app.use(cors({ origin: (origin, done) => {
    if (!origin || allowedBrowserOrigins.has(origin)) return done(null, true);
    return done(new Error('Origen CORS no autorizado para EduQuest.'));
} }));
app.use(express.json());

// El envio no depende exclusivamente del temporizador del servidor.
// Tras guardar una mutacion academica, reactivar el procesador ya con la
// transaccion confirmada. El cron externo recupera cualquier trabajo pendiente.
app.use((req, res, next) => {
    const changed = /^(POST|PATCH|PUT|DELETE)$/.test(req.method);
    const related = /^\/api\/(?:early-notices|institution-communications|auth\/register-student)(?:\/|$)/.test(req.path);
    if (changed && related) {
        res.once('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300)
                void processWebPushQueue().catch(err => console.error('[EduQuest][PUSH] Post-commit:', err));
        });
    }
    next();
});

// Recuperacion de cola desde Cloudflare Workers Cron: nunca expone datos ni
// permite procesar trabajos sin un secreto exclusivo del servidor.
function constantTimeEqual(left, right) {
    const a = Buffer.from(String(left ?? ''));
    const b = Buffer.from(String(right ?? ''));
    return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
app.post('/internal/web-push/drain', async (req, res) => {
    const secret = process.env.WEB_PUSH_CRON_SECRET;
    if (!secret || secret.length < 32) return res.sendStatus(503);
    const authorization = req.get('authorization') || '';
    if (!authorization.startsWith('Bearer ') || !constantTimeEqual(authorization.slice(7), secret))
        return res.sendStatus(401);
    try {
        await processWebPushQueue();
        return res.json({ ok: true });
    } catch (error) {
        console.error('[EduQuest][PUSH] Recuperacion fallida:', error);
        return res.sendStatus(503);
    }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '../uploads'))
);

app.use('/api', apiRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);

// Avisos Tempranos
app.use('/api/early-notices', earlyNoticeRoutes);
app.use('/api/institution-communications', institutionCommunicationRoutes);

export default app;
