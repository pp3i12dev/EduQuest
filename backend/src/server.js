import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Usar siempre backend/.env independientemente de la carpeta desde donde se inicia Node.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

import app from './app.js';
import { startNotificationEmailProcessor } from './services/notificationEmail.service.js';
import { startWebPushProcessor } from './services/webPush.service.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  startNotificationEmailProcessor();
  startWebPushProcessor();
});
