
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

// SUPER_ADMIN: institutionId null permite listar usuarios
// de todas las instituciones.
// Otros roles: se filtran por la institución asignada.
export const listUsersByProfile = ({ institutionId, profileField }) => {
  const prisma = getPrisma();

  return prisma.user.findMany({
    where: {
      ...(institutionId != null ? { institutionId } : {}),
      [profileField]: { isNot: null },
      deletedAt: null,
    },
    include: {
      [profileField]: true,
    },
    orderBy: {
      lastName: 'asc',
    },
  });
};

export const createUserWithProfile = ({
  userData,
  profileField,
  profileData,
}) => {
  const prisma = getPrisma();

  return prisma.user.create({
    data: {
      ...userData,
      [profileField]: {
        create: profileData,
      },
    },
    include: {
      [profileField]: true,
    },
  });
};

export const createStudentSelfSignup = ({ userData, courseId }) => {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        ...userData,
        isActive: false,
        signupStatus: 'PENDING',
        studentProfile: {
          create: {
            legajoStudent: `ALU-${Date.now()}`,
            avatarConfig: {
              create: {
                configJson: {
                  skin: 'default',
                  hair: 'short',
                  shirtColor: '#3b82f6',
                },
              },
            },
          },
        },
      },
      include: {
        studentProfile: {
          include: {
            avatarConfig: true,
          },
        },
      },
    });

    await tx.studentCourse.create({
      data: {
        studentId: user.studentProfile.id,
        courseId,
      },
    });

    return user;
  });
};

export const updateUserWithProfile = ({
  id,
  institutionId,
  userData,
  profileField,
  profileData,
}) => {
  const prisma = getPrisma();

  return prisma.user.update({
    where: {
      id,
      institutionId,
      deletedAt: null,
    },
    data: {
      ...userData,
      ...(profileData && Object.keys(profileData).length > 0
        ? {
          [profileField]: {
            update: profileData,
          },
        }
        : {}),
    },
    include: {
      [profileField]: true,
    },
  });
};

export const setUserActive = ({
  id,
  institutionId,
  isActive,
}) => {
  const prisma = getPrisma();

  return prisma.user.update({
    where: {
      id,
      ...(institutionId != null ? { institutionId } : {}),
      deletedAt: null,
    },
    data: {
      isActive,
    },
  });
};

/**
 * Traslado interinstitucional controlado. El usuario cambia de institución,
 * pero sus datos historicos permanecen asociados a los registros originales.
 * Se eliminan matrículas vigentes y se desactivan asignaciones docentes.
 */
export const transferUserInstitution = async ({ id, previousInstitutionId, targetInstitutionId, userData, profileField, profileData }) => {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where: { id, institutionId: previousInstitutionId, deletedAt: null }, include: PROFILE_INCLUDE });
    if (!user) throw Object.assign(new Error('Usuario inexistente'), { status: 404 });
    const destination = await tx.institution.findFirst({ where: { id: targetInstitutionId, isActive: true }, select: { id: true } });
    if (!destination) throw Object.assign(new Error('La institución de destino no está disponible'), { status: 400 });
    if (user.studentProfile) await tx.studentCourse.deleteMany({ where: { studentId: user.studentProfile.id } });
    if (user.teacherProfile) {
      const active = await tx.teacherSubject.findMany({ where: { teacherId: user.teacherProfile.id, isActive: true }, select: { id: true } });
      const ids = active.map(row => row.id);
      await tx.teacherSubject.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
      if (ids.length) {
        await tx.activity.updateMany({ where: { teacherSubjectId: { in: ids } }, data: { isPublished: false, status: 'INACTIVE' } });
        await tx.studyMaterial.updateMany({ where: { teacherSubjectId: { in: ids } }, data: { isPublished: false } });
      }
    }
    // Invalidar sesiones y suscripciones Push del usuario: requiere nuevo inicio de sesión.
    await tx.refreshToken.deleteMany({ where: { userId: id } });
    await tx.webPushSubscription.deleteMany({ where: { userId: id } });
    await tx.userDevice.deleteMany({ where: { userId: id } });
    return tx.user.update({
      where: { id },
      data: {
        ...userData,
        institutionId: targetInstitutionId,
        ...(profileData && Object.keys(profileData).length ? { [profileField]: { update: profileData } } : {}),
      },
      include: { [profileField]: true },
    });
  });
};

/**
 * Retiro operativo. No destruye GameAttempt, EarlyNotice ni registros de auditoría.
 * Se invalida acceso y se liberan las asignaciones vigentes.
 */
export const archiveUserWithRelations = async ({ id, institutionId }) => {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id, deletedAt: null, ...(institutionId != null ? { institutionId } : {}) },
      include: PROFILE_INCLUDE,
    });
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    if (user.isSuperAdmin) throw Object.assign(new Error('No se puede eliminar una cuenta superadministradora'), { status: 403 });
    if (user.teacherProfile) {
      const active = await tx.teacherSubject.findMany({ where: { teacherId: user.teacherProfile.id, isActive: true }, select: { id: true } });
      const ids = active.map(row => row.id);
      await tx.teacherSubject.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
      // Ya no deben publicarse actividades ni documentos ligados a la cuenta retirada.
      await tx.activity.updateMany({ where: { teacherId: user.teacherProfile.id, isPublished: true }, data: { isPublished: false, status: 'INACTIVE' } });
      if (ids.length) await tx.studyMaterial.updateMany({ where: { teacherSubjectId: { in: ids } }, data: { isPublished: false } });
    }
    if (user.studentProfile) await tx.studentCourse.deleteMany({ where: { studentId: user.studentProfile.id } });
    await tx.refreshToken.deleteMany({ where: { userId: id } });
    await tx.webPushSubscription.deleteMany({ where: { userId: id } });
    await tx.userDevice.deleteMany({ where: { userId: id } });
    return tx.user.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  });
};

export const deleteUserById = ({
  id,
  institutionId,
}) => {
  const prisma = getPrisma();

  return prisma.user.delete({
    where: {
      id,
      institutionId,
    },
  });
};

// Reemplaza la matrícula actual del alumno por el curso indicado
// (o la borra si courseId viene null/undefined).
// Nunca deja al alumno con más de un curso activo a la vez.
export const assignStudentCourse = async ({
  studentProfileId,
  courseId,
}) => {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    // La edición del alumno puede TRANSFERIR la matrícula de curso, nunca duplicarla.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${studentProfileId}::integer, 817231::integer)`;
    const profile = await tx.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { user: { select: { institutionId: true } } },
    });
    if (!profile) throw Object.assign(new Error('Alumno inexistente'), { status: 404 });
    if (courseId != null) {
      const target = await tx.course.findUnique({ where: { id: courseId }, select: { institutionId: true } });
      if (!target || target.institutionId !== profile.user.institutionId) {
        throw Object.assign(new Error('El curso no pertenece a la institución del alumno'), { status: 400 });
      }
    }
    await tx.studentCourse.deleteMany({ where: { studentId: studentProfileId } });
    if (courseId != null) {
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

export const findUserWithAllProfiles = ({
  id,
  institutionId,
}) => {
  const prisma = getPrisma();

  return prisma.user.findFirst({
    where: {
      id,
      ...(institutionId != null ? { institutionId } : {}),
      deletedAt: null,
    },
    include: ALL_PROFILES_INCLUDE,
  });
};

export const addProfileToUser = ({
  id,
  profileField,
  profileData,
}) => {
  const prisma = getPrisma();

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      [profileField]: {
        create: profileData,
      },
    },
  });
};

export const removeProfileFromUser = ({
  id,
  profileField,
}) => {
  const prisma = getPrisma();

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      [profileField]: {
        delete: true,
      },
    },
  });
};

// ======================================================
// MI PERFIL - OPERACIONES DEL USUARIO AUTENTICADO
// ======================================================

/**
 * Obtiene los datos del usuario autenticado.
 *
 * La identidad se obtiene desde req.user.id
 * en el servicio/controlador, nunca desde
 * un ID proporcionado por el cliente.
 *
 * Incluye perfiles para poder mostrar
 * información correspondiente a todos sus roles.
 */
export const findOwnUserProfile = (userId) => {
  const prisma = getPrisma();

  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: ALL_PROFILES_INCLUDE,
  });
};

/**
 * Actualiza únicamente los campos personales
 * que el servicio haya autorizado previamente.
 *
 * No acepta modificaciones de roles,
 * institución, estado de cuenta o perfiles.
 */
export const updateOwnUserProfile = ({
  userId,
  data,
}) => {
  const prisma = getPrisma();

  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    include: ALL_PROFILES_INCLUDE,
  });
};

/**
 * Actualiza exclusivamente el hash de contraseña.
 *
 * La comprobación de la contraseña actual
 * corresponde al servicio.
 */
export const updateOwnPasswordHash = ({
  userId,
  passwordHash,
  previousPasswordHash,
}) => {
  const prisma = getPrisma();

  return prisma.user.updateMany({
    where: {
      id: userId,
      passwordHash: previousPasswordHash,
      isActive: true,
    },
    data: {
      passwordHash,
    },
  });
};

// La autorización para consultar registros por institución se realiza además
// en la capa de servicios. Esta consulta evita que el botón histórico active
// solicitudes públicas sin aprobación.
export const findUserByIdForInstitution = ({ id, institutionId }) => getPrisma().user.findFirst({
  where: { id, deletedAt: null, ...(institutionId != null ? { institutionId } : {}) },
  select: { id: true, signupStatus: true },
});
