import prisma from '../config/prisma.js';

// Busca un usuario por email trayendo sus perfiles (Student, Teacher, etc.)
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: true,
      teacherProfile: true,
      preceptorProfile: true,
      directorProfile: true,
    },
  });
};

// Inserción de Alumno (Crea Usuario + Perfil + Avatar inicial + Matrícula en un solo paso)
export const createStudentTransaction = async (userData, studentProfileData, courseId) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        ...userData,
        studentProfile: {
          create: {
            ...studentProfileData,
            avatarConfig: {
              create: {
                configJson: { skin: 'default', hair: 'short', shirtColor: '#3b82f6' },
              },
            },
          },
        },
      },
      include: {
        studentProfile: {
          include: { avatarConfig: true },
        },
      },
    });

    await tx.studentCourse.create({
      data: {
        studentId: user.studentProfile.id,
        courseId: courseId,
      },
    });

    return user;
  });
};

// Inserción de Docente (Valida invitación y quema el token usado)
export const createTeacherTransaction = async (userData, teacherProfileData, invitationToken) => {
  return await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { token: invitationToken },
    });

    if (!invitation || invitation.isUsed) {
      throw new Error('La invitación no es válida o ya fue utilizada');
    }

    const user = await tx.user.create({
      data: {
        ...userData,
        teacherProfile: {
          create: teacherProfileData,
        },
      },
      include: { teacherProfile: true },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { isUsed: true },
    });

    return user;
  });
};