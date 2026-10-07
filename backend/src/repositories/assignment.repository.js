import { getPrisma } from '../config/prisma.js';

export const listAssignmentOptions = async (institutionId) => {
    const prisma = getPrisma();

    const [courses, subjects, students, teachers] = await Promise.all([
        prisma.course.findMany({
            where: { institutionId },
            include: { career: true },
            orderBy: { nombre: 'asc' },
        }),

        prisma.subject.findMany({
            where: { institutionId },
            orderBy: { nombre: 'asc' },
        }),

        prisma.studentProfile.findMany({
            where: {
                user: {
                    institutionId,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dni: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
            orderBy: {
                user: {
                    lastName: 'asc',
                },
            },
        }),

        prisma.teacherProfile.findMany({
            where: {
                user: {
                    institutionId,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dni: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
            orderBy: {
                user: {
                    lastName: 'asc',
                },
            },
        }),
    ]);

    return {
        courses,
        subjects,
        students,
        teachers,
    };
};

export const listStudentsForCourse = async (institutionId, courseId) => {
    const prisma = getPrisma();

    const students = await prisma.studentProfile.findMany({
        where: {
            user: {
                institutionId,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dni: true,
                    email: true,
                    isActive: true,
                },
            },
            courses: {
                where: {
                    courseId,
                },
                select: {
                    id: true,
                    courseId: true,
                },
            },
        },
        orderBy: {
            user: {
                lastName: 'asc',
            },
        },
    });

    return students.map((student) => ({
        id: student.id,
        legajoStudent: student.legajoStudent,
        user: student.user,
        assigned: student.courses.length > 0,
    }));
};

export const createStudentCourse = (studentId, courseId) => {
    const prisma = getPrisma();

    return prisma.studentCourse.create({
        data: {
            studentId,
            courseId,
        },
    });
};

export const deleteStudentCourse = (studentId, courseId) => {
    const prisma = getPrisma();

    return prisma.studentCourse.deleteMany({
        where: {
            studentId,
            courseId,
        },
    });
};

export const findStudent = (institutionId, studentId) => {
    const prisma = getPrisma();

    return prisma.studentProfile.findFirst({
        where: {
            id: studentId,
            user: {
                institutionId,
            },
        },
        include: {
            user: true,
        },
    });
};

export const findCourse = (institutionId, courseId) => {
    const prisma = getPrisma();

    return prisma.course.findFirst({
        where: {
            id: courseId,
            institutionId,
        },
    });
};

export const listTeachersForCourseSubject = async (
    institutionId,
    courseId,
    subjectId
) => {
    const prisma = getPrisma();

    const teachers = await prisma.teacherProfile.findMany({
        where: {
            user: {
                institutionId,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dni: true,
                    email: true,
                    isActive: true,
                },
            },
            teacherSubjects: {
                where: {
                    courseId,
                    subjectId,
                },
                select: {
                    id: true,
                    teacherId: true,
                    subjectId: true,
                    courseId: true,
                },
            },
        },
        orderBy: {
            user: {
                lastName: 'asc',
            },
        },
    });

    return teachers.map((teacher) => ({
        id: teacher.id,
        legajoTeacher: teacher.legajoTeacher,
        specialty: teacher.specialty,
        user: teacher.user,
        assigned: teacher.teacherSubjects.length > 0,
        assignmentId: teacher.teacherSubjects[0]?.id ?? null,
    }));
};

export const findTeacher = (institutionId, teacherId) => {
    const prisma = getPrisma();

    return prisma.teacherProfile.findFirst({
        where: {
            id: teacherId,
            user: {
                institutionId,
            },
        },
        include: {
            user: true,
        },
    });
};

export const findSubject = (institutionId, subjectId) => {
    const prisma = getPrisma();

    return prisma.subject.findFirst({
        where: {
            id: subjectId,
            institutionId,
        },
    });
};

export const createTeacherSubject = (teacherId, subjectId, courseId) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.create({
        data: {
            teacherId,
            subjectId,
            courseId,
        },
        include: {
            teacher: {
                include: {
                    user: true,
                },
            },
            subject: true,
            course: true,
        },
    });
};

export const deleteTeacherSubject = (id) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.delete({
        where: { id },
    });
};

export const listSchedules = async (institutionId, courseId, subjectId) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.findMany({
        where: {
            courseId,
            subjectId,
            course: {
                institutionId,
            },
        },
        include: {
            subject: true,
            course: true,
        },
        orderBy: [
            { day: 'asc' },
            { startTime: 'asc' },
        ],
    });
};

export const findSchedule = (institutionId, id) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.findFirst({
        where: {
            id,
            course: {
                institutionId,
            },
        },
    });
};

export const listSchedulesForConflict = async (
    institutionId,
    courseId,
    day,
    excludeId = null
) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.findMany({
        where: {
            courseId,
            day,
            course: {
                institutionId,
            },
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
    });
};

export const createSchedule = (data) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.create({
        data,
        include: {
            subject: true,
            course: true,
        },
    });
};

export const updateSchedule = (id, data) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.update({
        where: { id },
        data,
        include: {
            subject: true,
            course: true,
        },
    });
};

export const deleteSchedule = (id) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.delete({
        where: { id },
    });
};