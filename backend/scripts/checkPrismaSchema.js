
import {
    existsSync,
    readFileSync,
    readdirSync,
} from 'node:fs';

import { join, resolve } from 'node:path';

const prismaDir = resolve(process.cwd(), 'prisma');

const requiredModels = [
    'User',
    'Institution',
    'Career',
    'Course',
    'Subject',
    'TeacherSubject',
    'StudentCourse',
    'SubjectSchedule',
    'Invitation',
    'EarlyNotice',
];

const requiredFields = {
    User: ['institutionId', 'telefono', 'isSuperAdmin'],
    Career: ['institutionId', 'level'],
    Course: ['careerId', 'institutionId'],
    Subject: ['institutionId', 'isActive'],
    Invitation: ['email', 'role', 'institutionId'],
    EarlyNotice: [
        'institutionId',
        'teacherUserId',
        'createdById',
        'status',
        'type',
    ],
};

function findPrismaFiles(directory) {
    const files = [];

    for (const entry of readdirSync(directory, {
        withFileTypes: true,
    })) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...findPrismaFiles(fullPath));
        } else if (
            entry.isFile() &&
            entry.name.endsWith('.prisma')
        ) {
            files.push(fullPath);
        }
    }

    return files;
}

function getModelBody(source, modelName) {
    const pattern = new RegExp(
        `\\bmodel\\s+${modelName}\\s*\\{([\\s\\S]*?)\\}`
    );

    return source.match(pattern)?.[1] ?? null;
}

function main() {
    console.log('\nEDUQUEST - AUDITORÍA PRISMA\n');

    if (!existsSync(prismaDir)) {
        console.error('No existe la carpeta prisma.');
        process.exitCode = 1;
        return;
    }

    const files = findPrismaFiles(prismaDir);

    console.log('Archivos encontrados:\n');

    for (const file of files) {
        console.log(`- ${file}`);
    }

    const source = files
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n');

    console.log('\nMODELOS\n');

    let missing = false;

    for (const model of requiredModels) {
        const body = getModelBody(source, model);

        console.log(
            `${body !== null ? 'OK' : 'FALTA'} Modelo ${model}`
        );

        if (body === null) missing = true;
    }

    console.log('\nCAMPOS\n');

    for (const [model, fields] of Object.entries(
        requiredFields
    )) {
        const body = getModelBody(source, model);

        if (body === null) continue;

        for (const field of fields) {
            const pattern = new RegExp(
                `^\\s*${field}\\s+`,
                'm'
            );

            const found = pattern.test(body);

            console.log(
                `${found ? 'OK' : 'FALTA'} ${model}.${field}`
            );

            if (!found) missing = true;
        }
    }

    console.log(
        missing
            ? '\nHay elementos pendientes de revisar.'
            : '\nTodos los elementos requeridos fueron encontrados.'
    );

    console.log(
        '\nEste script no modifica archivos ni la base de datos.'
    );
}

main();
