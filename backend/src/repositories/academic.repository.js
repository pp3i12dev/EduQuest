import { getPrisma } from '../config/prisma.js';

export const listInstitutions = () => {
    const prisma = getPrisma();
    return prisma.institution.findMany({
        select: { id: true, nombre: true, distrito: true, provincia: true },
        orderBy: { nombre: 'asc' },
    });
};

export const listCareersByInstitution = (institutionId) => {
    const prisma = getPrisma();
    return prisma.career.findMany({
        where: { institutionId },
        select: { id: true, nombre: true, level: true },
        orderBy: { nombre: 'asc' },
    });
};

export const listCoursesByCareer = (careerId) => {
    const prisma = getPrisma();
    return prisma.course.findMany({
        where: { careerId },
        select: { id: true, nombre: true, academicYear: true },
        orderBy: { nombre: 'asc' },
    });
};

export const findCourseInInstitution = (courseId, institutionId) => {
    const prisma = getPrisma();
    return prisma.course.findFirst({ where: { id: courseId, institutionId } });
};

export const findTeacherAssignment = (teacherId, courseId) => {
    const prisma = getPrisma();
    return prisma.teacherSubject.findFirst({ where: { teacherId, courseId } });
};

export const findTeacherProfileByUserId = (userId) => {
    const prisma = getPrisma();
    return prisma.teacherProfile.findUnique({ where: { userId } });
};