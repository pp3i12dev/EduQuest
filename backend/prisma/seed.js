import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('❌ DATABASE_URL no está definida.');
}

const adapter = new PrismaNeon({
    connectionString
});

const prisma = new PrismaClient({
    adapter
});

async function main() {
    console.log('🌱 Iniciando seeding...');

    // 1. Institución de prueba
    const institution = await prisma.institution.upsert({
        where: { cue: '040000000' },
        update: {},
        create: {
            nombre: 'Instituto EduQuest',
            cue: '040000000',
            distrito: 'La Plata',
            provincia: 'Buenos Aires',
            direccion: 'Calle 50 N° 123',
            telefono: '221-4000000'
        }
    });

    console.log(`✅ Institución creada/existente: ${institution.nombre} (id: ${institution.id})`);

    // 2. Usuario director
    const plainPassword = 'Director123!';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const directorUser = await prisma.user.upsert({
        where: { email: 'director@eduquest.com' },
        update: {},
        create: {
            dni: '30000000',
            email: 'director@eduquest.com',
            passwordHash,
            firstName: 'Marcos',
            lastName: 'Gómez',
            isActive: true,
            institutionId: institution.id
        }
    });

    console.log(`✅ Usuario creado/existente: ${directorUser.email} (id: ${directorUser.id})`);

    // 3. Perfil de director asociado
    const directorProfile = await prisma.directorProfile.upsert({
        where: { userId: directorUser.id },
        update: {},
        create: {
            position: 'Director General',
            userId: directorUser.id
        }
    });

    console.log(`✅ DirectorProfile creado/existente (id: ${directorProfile.id})`);

    console.log('🌱 Seeding finalizado con éxito.');
    console.log('----------------------------------------');
    console.log('Credenciales para login:');
    console.log(`  Email: director@eduquest.com`);
    console.log(`  DNI:   30000000`);
    console.log(`  Password: ${plainPassword}`);
    console.log('----------------------------------------');
}

main()
    .catch((error) => {
        console.error('❌ Error en seeding:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });