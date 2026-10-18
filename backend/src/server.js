import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { startNotificationEmailProcessor } from './services/notificationEmail.service.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  startNotificationEmailProcessor();
});
