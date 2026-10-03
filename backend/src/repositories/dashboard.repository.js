import { getPrisma } from '../config/prisma.js';

export const countProfilesByInstitution = async (
    institutionId
) => {
    const prisma = getPrisma();

    const [
        students,
        teachers,
        preceptors,
        directors,
        invitations,
        careers,
        courses,
        subjects,
        studentAssignments,
        teacherAssignments,
        schedules,
        institutions,
    ] = await Promise.all([
        prisma.studentProfile.count({
            where: {
                user: {
                    institutionId,
                },
            },
        }),

        prisma.teacherProfile.count({
            where: {
                user: {
                    institutionId,
                },
            },
        }),

        prisma.preceptorProfile.count({
            where: {
                user: {
                    institutionId,
                },
            },
        }),

        prisma.directorProfile.count({
            where: {
                user: {
                    institutionId,
                },
            },
        }),

        prisma.invitation.count({
            where: {
                isUsed: false,
                invitedBy: {
                    institutionId,
                },
            },
        }),

        prisma.career.count({
            where: {
                institutionId,
            },
        }),

        prisma.course.count({
            where: {
                institutionId,
            },
        }),

        prisma.subject.count({
            where: {
                institutionId,
            },
        }),

        prisma.studentCourse.count({
            where: {
                course: {
                    institutionId,
                },
            },
        }),

        prisma.teacherSubject.count({
            where: {
                course: {
                    institutionId,
                },
            },
        }),

        prisma.subjectSchedule.count({
            where: {
                course: {
                    institutionId,
                },
            },
        }),

        prisma.institution.count(),
    ]);

    return {
        students,
        teachers,
        preceptors,
        directors,
        invitations,
        careers,
        courses,
        subjects,
        studentAssignments,
        teacherAssignments,
        schedules,
        institutions,
    };
};