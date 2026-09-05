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

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'EduQuest123!';

async function createUserWithProfile({ dni, email, firstName, lastName, institutionId, profile }) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            dni,
            email,
            passwordHash,
            firstName,
            lastName,
            isActive: true,
            institutionId,
        },
    });

    if (profile?.type === 'director') {
        await prisma.directorProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, position: profile.position },
        });
    }

    if (profile?.type === 'preceptor') {
        await prisma.preceptorProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, legajoPreceptor: profile.legajoPreceptor, shift: profile.shift },
        });
    }

    if (profile?.type === 'teacher') {
        await prisma.teacherProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, legajoTeacher: profile.legajoTeacher, specialty: profile.specialty },
        });
    }

    if (profile?.type === 'student') {
        await prisma.studentProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, legajoStudent: profile.legajoStudent },
        });
    }

    console.log(`✅ ${profile?.type ?? 'usuario'} creado/existente: ${email} (id: ${user.id})`);
    return user;
}

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
            telefono: '221-4000000',
        },
    });

    console.log(`✅ Institución creada/existente: ${institution.nombre} (id: ${institution.id})`);

    // 2. Director
    await createUserWithProfile({
        dni: '30000000',
        email: 'director@eduquest.com',
        firstName: 'Marcos',
        lastName: 'Gómez',
        institutionId: institution.id,
        profile: { type: 'director', position: 'Director General' },
    });

    // 3. Preceptores
    await createUserWithProfile({
        dni: '30000001',
        email: 'preceptor1@eduquest.com',
        firstName: 'Laura',
        lastName: 'Fernández',
        institutionId: institution.id,
        profile: { type: 'preceptor', legajoPreceptor: 'PREC-001', shift: 'Mañana' },
    });

    await createUserWithProfile({
        dni: '30000002',
        email: 'preceptor2@eduquest.com',
        firstName: 'Diego',
        lastName: 'Suárez',
        institutionId: institution.id,
        profile: { type: 'preceptor', legajoPreceptor: 'PREC-002', shift: 'Tarde' },
    });

    // 4. Docentes
    await createUserWithProfile({
        dni: '30000003',
        email: 'docente1@eduquest.com',
        firstName: 'Ana',
        lastName: 'Ríos',
        institutionId: institution.id,
        profile: { type: 'teacher', legajoTeacher: 'DOC-001', specialty: 'Matemática' },
    });

    await createUserWithProfile({
        dni: '30000004',
        email: 'docente2@eduquest.com',
        firstName: 'Pablo',
        lastName: 'Martínez',
        institutionId: institution.id,
        profile: { type: 'teacher', legajoTeacher: 'DOC-002', specialty: 'Lengua' },
    });

    await createUserWithProfile({
        dni: '30000005',
        email: 'docente3@eduquest.com',
        firstName: 'Carla',
        lastName: 'López',
        institutionId: institution.id,
        profile: { type: 'teacher', legajoTeacher: 'DOC-003', specialty: 'Historia' },
    });

    // 5. Alumnos
    const students = [
        { dni: '40000001', email: 'alumno1@eduquest.com', firstName: 'Tomás', lastName: 'Acosta', legajo: 'ALU-001' },
        { dni: '40000002', email: 'alumno2@eduquest.com', firstName: 'Sofía', lastName: 'Benítez', legajo: 'ALU-002' },
        { dni: '40000003', email: 'alumno3@eduquest.com', firstName: 'Nicolás', lastName: 'Castro', legajo: 'ALU-003' },
        { dni: '40000004', email: 'alumno4@eduquest.com', firstName: 'Valentina', lastName: 'Díaz', legajo: 'ALU-004' },
        { dni: '40000005', email: 'alumno5@eduquest.com', firstName: 'Bruno', lastName: 'Ezcurra', legajo: 'ALU-005' },
    ];

    for (const s of students) {
        await createUserWithProfile({
            dni: s.dni,
            email: s.email,
            firstName: s.firstName,
            lastName: s.lastName,
            institutionId: institution.id,
            profile: { type: 'student', legajoStudent: s.legajo },
        });
    }

    console.log('🌱 Seeding finalizado con éxito.');
    console.log('----------------------------------------');
    console.log(`Password para todos los usuarios: ${DEFAULT_PASSWORD}`);
    console.log('Emails: director@eduquest.com, preceptor1@eduquest.com, preceptor2@eduquest.com,');
    console.log('        docente1@eduquest.com, docente2@eduquest.com, docente3@eduquest.com,');
    console.log('        alumno1@eduquest.com ... alumno5@eduquest.com');
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