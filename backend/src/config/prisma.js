import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '../../.env')
});

neonConfig.webSocketConstructor = ws;

let prismaInstance = null;

export const getPrisma = () => {
    if (!prismaInstance) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('❌ DATABASE_URL no está definida.');
        }

        const adapter = new PrismaNeon({
            connectionString
        });

        prismaInstance = new PrismaClient({
            adapter
        });
    }

    return prismaInstance;
};