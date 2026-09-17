import { getPrisma } from '../config/prisma.js';

const PROFILE_INCLUDE = {
  directorProfile: true,
  teacherProfile: true,
  preceptorProfile: true,
  studentProfile: true,
};

export const findUserByEmailOrDni = ({ email, dni }) => {
  const prisma = getPrisma();
  return prisma.user.findFirst({
    where: email ? { email } : { dni },
    include: PROFILE_INCLUDE,
  });
};

export const listUsersByProfile = ({ institutionId, profileField }) => {
  const prisma = getPrisma();
  return prisma.user.findMany({
    where: { institutionId, [profileField]: { isNot: null } },
    include: { [profileField]: true },
    orderBy: { lastName: 'asc' },
  });
};

export const createUserWithProfile = ({ userData, profileField, profileData }) => {
  const prisma = getPrisma();
  return prisma.user.create({
    data: { ...userData, [profileField]: { create: profileData } },
    include: { [profileField]: true },
  });
};

export const createStudentSelfSignup = ({ userData, courseId }) => {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        ...userData,
        isActive: false,
        studentProfile: {
          create: {
            legajoStudent: `ALU-${Date.now()}`,
            avatarConfig: {
              create: { configJson: { skin: 'default', hair: 'short', shirtColor: '#3b82f6' } },
            },
          },
        },
      },
      include: { studentProfile: { include: { avatarConfig: true } } },
    });

    await tx.studentCourse.create({
      data: { studentId: user.studentProfile.id, courseId },
    });

    return user;
  });
};

export const updateUserWithProfile = ({ id, institutionId, userData, profileField, profileData }) => {
  const prisma = getPrisma();
  return prisma.user.update({
    where: { id, institutionId },
    data: {
      ...userData,
      ...(profileData && Object.keys(profileData).length > 0
        ? { [profileField]: { update: profileData } }
        : {}),
    },
    include: { [profileField]: true },
  });
};

export const setUserActive = ({ id, institutionId, isActive }) => {
  const prisma = getPrisma();
  return prisma.user.update({ where: { id, institutionId }, data: { isActive } });
};

export const deleteUserById = ({ id, institutionId }) => {
  const prisma = getPrisma();
  return prisma.user.delete({ where: { id, institutionId } });
};

// Reemplaza la matrícula actual del alumno por el curso indicado
// (o la borra si courseId viene null/undefined). Nunca deja al alumno
// con más de un curso activo a la vez.
export const assignStudentCourse = async ({ studentProfileId, courseId }) => {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.studentCourse.deleteMany({ where: { studentId: studentProfileId } });
    if (courseId) {
      await tx.studentCourse.create({ data: { studentId: studentProfileId, courseId } });
    }
  });
};

const ALL_PROFILES_INCLUDE = {
  studentProfile: true,
  teacherProfile: true,
  preceptorProfile: true,
  directorProfile: true,
};

export const findUserWithAllProfiles = ({ id, institutionId }) => {
  const prisma = getPrisma();
  return prisma.user.findFirst({
    where: { id, institutionId },
    include: ALL_PROFILES_INCLUDE,
  });
};

export const addProfileToUser = ({ id, profileField, profileData }) => {
  const prisma = getPrisma();
  return prisma.user.update({
    where: { id },
    data: { [profileField]: { create: profileData } },
  });
};

export const removeProfileFromUser = ({ id, profileField }) => {
  const prisma = getPrisma();
  return prisma.user.update({
    where: { id },
    data: { [profileField]: { delete: true } },
  });
};