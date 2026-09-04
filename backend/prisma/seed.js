import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando la carga de datos iniciales (Seeding)...');

    // 1. Limpieza de datos previa (en orden inverso de dependencias para evitar errores de Foreign Keys)
    await prisma.studentInventory.deleteMany();
    await prisma.storeItem.deleteMany();
    await prisma.gameAttempt.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.studentCourse.deleteMany();
    await prisma.teacherSubject.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.course.deleteMany();
    await prisma.career.deleteMany();
    await prisma.avatarConfig.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.preceptorProfile.deleteMany();
    await prisma.directorProfile.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.institution.deleteMany();

    console.log('🧹 Base de datos limpiada correctamente.');

    // 2. Crear la Institución Raíz
    const institucion = await prisma.institution.create({
        data: {
            nombre: 'Instituto Superior de Formación Técnica Nº 12',
            cue: '06012345',
            distrito: 'La Plata',
            provincia: 'Buenos Aires',
            direccion: 'Calle 12 e/ 45 y 46',
            telefono: '0221-4240000',
        },
    });
    console.log(`🏫 Institución creada: ${institucion.nombre}`);

    // 3. Crear Estructura Académica (Carrera, Curso y Materia)
    const carrera = await prisma.career.create({
        data: {
            nombre: 'Tecnicatura Superior en Análisis de Sistemas',
            institutionId: institucion.id,
        },
    });

    const curso = await prisma.course.create({
        data: {
            nombre: '1° A',
            academicYear: 2026,
            institutionId: institucion.id,
            careerId: carrera.id,
        },
    });

    const materiaBD = await prisma.subject.create({
        data: { nombre: 'Bases de Datos I' },
    });

    console.log(`📚 Estructura creada: ${carrera.nombre} -> ${curso.nombre}`);

    // 4. Crear Usuario Directivo
    const userDirector = await prisma.user.create({
        data: {
            dni: '11222333',
            email: 'director@isft12.edu.ar',
            passwordHash: '$2a$10$hashedpasswordexample', // Hash de prueba bcrypt
            firstName: 'Carlos',
            lastName: 'Gómez',
            institutionId: institucion.id,
            directorProfile: {
                create: {
                    position: 'Director General',
                },
            },
        },
    });
    console.log(`👨‍💼 Directivo creado: ${userDirector.firstName} ${userDirector.lastName}`);

    // 5. Crear Usuario Multirrol (Docente + Preceptor al mismo tiempo)
    const userDocentePreceptor = await prisma.user.create({
        data: {
            dni: '22333444',
            email: 'marta.profesora@isft12.edu.ar',
            passwordHash: '$2a$10$hashedpasswordexample',
            firstName: 'Marta',
            lastName: 'Rodríguez',
            institutionId: institucion.id,
            teacherProfile: {
                create: {
                    legajoTeacher: 'DOC-2026-01',
                    specialty: 'Base de Datos y Desarrollo Web',
                },
            },
            preceptorProfile: {
                create: {
                    legajoPreceptor: 'PREC-2026-01',
                    shift: 'Vespertino',
                },
            },
        },
        include: {
            teacherProfile: true,
            preceptorProfile: true,
        },
    });
    console.log(`👩‍🏫 Usuario Doble Rol creado (Docente + Preceptora): ${userDocentePreceptor.firstName}`);

    // Vincular al Docente con la Materia y el Curso
    await prisma.teacherSubject.create({
        data: {
            teacherId: userDocentePreceptor.teacherProfile.id,
            subjectId: materiaBD.id,
            courseId: curso.id,
        },
    });

    // 6. Crear Usuario Alumno con Gamificación Inicial
    const userAlumno = await prisma.user.create({
        data: {
            dni: '44555666',
            email: 'alumno.ejemplo@isft12.edu.ar',
            passwordHash: '$2a$10$hashedpasswordexample',
            firstName: 'Lucas',
            lastName: 'Martínez',
            institutionId: institucion.id,
            studentProfile: {
                create: {
                    legajoStudent: 'ALU-2026-101',
                    puntosTotales: 350,
                    nivelActual: 2,
                    monedas: 120,
                    avatarConfig: {
                        create: {
                            configJson: {
                                skinColor: '#ffdbac',
                                hairStyle: 'short_curly',
                                shirtColor: '#3b82f6',
                            },
                        },
                    },
                },
            },
        },
        include: {
            studentProfile: true,
        },
    });
    console.log(`🎮 Alumno creado: ${userAlumno.firstName} (Lvl ${userAlumno.studentProfile.nivelActual})`);

    // Matricular Alumno en el Curso
    await prisma.studentCourse.create({
        data: {
            studentId: userAlumno.studentProfile.id,
            courseId: curso.id,
        },
    });

    // 7. Crear Ítems de la Tienda de Gamificación
    const item1 = await prisma.storeItem.create({
        data: {
            name: 'Gorra Gamer 3D',
            price: 50,
            category: 'HAT',
        },
    });

    const item2 = await prisma.storeItem.create({
        data: {
            name: 'Piel Cyberpunk',
            price: 200,
            category: 'SKIN',
        },
    });

    console.log('🛒 Ítems de la tienda agregados.');

    // 8. Simular Compra de un Ítem en el Inventario del Alumno
    await prisma.studentInventory.create({
        data: {
            studentId: userAlumno.studentProfile.id,
            itemId: item1.id,
        },
    });

    console.log('✅ Carga de datos de prueba completada con éxito.');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });