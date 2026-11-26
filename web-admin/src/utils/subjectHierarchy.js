// Reglas compartidas por el formulario y los filtros de Materias.
// La relación con Carrera se toma del Curso, como define Prisma.
export const careersForInstitution = (careers, institutionId) =>
    Number(institutionId) > 0
        ? (careers ?? []).filter(career => Number(career.institutionId) === Number(institutionId))
        : [];

export const coursesForCareer = (courses, institutionId, careerId) =>
    Number(institutionId) > 0 && Number(careerId) > 0
        ? (courses ?? []).filter(course =>
            Number(course.institutionId) === Number(institutionId) &&
            Number(course.careerId ?? course.career?.id) === Number(careerId))
        : [];

export const courseMatchesSelection = (course, { institutionId, careerId, courseId, shift }) => {
    if (!careerId) return true;
    if (!course || Number(course.institutionId) !== Number(institutionId)) return false;
    return Number(course.careerId ?? course.career?.id) === Number(careerId) &&
        (!shift || (shift === 'SIN_DEFINIR' ? !course.shift : course.shift === shift)) &&
        (!courseId || Number(course.id) === Number(courseId));
};

export const getSubjectCourseIds = subject => {
    const ids = [
        ...(subject.teachers ?? [])
            .filter(assignment => assignment.isActive)
            .map(assignment => assignment.courseId ?? assignment.course?.id),
        ...(subject.schedules ?? [])
            .map(schedule => schedule.courseId ?? schedule.course?.id),
    ];
    return [...new Set(ids.map(Number).filter(id => Number.isSafeInteger(id) && id > 0))];
};

export const subjectsForSelection = (subjects, courses, { institutionId, careerId, courseId, shift }) => {
    const byId = new Map((courses ?? []).map(course => [Number(course.id), course]));
    return (subjects ?? []).filter(subject => {
        if (Number(institutionId) > 0 && Number(subject.institutionId) !== Number(institutionId)) return false;
        if (!careerId) return true;
        return getSubjectCourseIds(subject).some(id =>
            courseMatchesSelection(byId.get(id), { institutionId, careerId, courseId, shift }));
    });
};
