
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const outputDir = resolve(root, 'diagnostics');
const outputFile = resolve(
    outputDir,
    'prisma-database-diff.sql'
);

mkdirSync(outputDir, { recursive: true });

try {
    const result = execFileSync(
        process.platform === 'win32'
            ? 'npx.cmd'
            : 'npx',
        [
            'prisma',
            'migrate',
            'diff',
            '--from-config-datasource',
            '--to-schema',
            './prisma',
            '--script',
        ],
        {
            cwd: root,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
        }
    );

    writeFileSync(
        outputFile,
        result,
        'utf8'
    );

    console.log(
        'Comparación generada correctamente.'
    );

    console.log(
        `Archivo: ${outputFile}`
    );

    console.log(
        'IMPORTANTE: el SQL generado es solo para revisión.'
    );

    console.log(
        'No lo ejecutes directamente en Neon.'
    );
} catch (error) {
    console.error(
        'No se pudo comparar Prisma con PostgreSQL.'
    );

    console.error(
        error.stderr?.toString() ||
        error.message
    );

    process.exitCode = 1;
}
