const prisma = require('../src/config/prisma');

const ROLES = ['ALUMNO', 'DOCENTE', 'PRECEPTOR', 'DIRECTIVO'];

async function main() {
  
    for (const name of ROLES) {
        await prisma.role.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('Roles cargados correctamente');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());