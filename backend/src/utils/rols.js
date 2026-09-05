export function getRolesFromUser(user) {
    const roles = [];
    if (user.directorProfile) roles.push('DIRECTOR');
    if (user.preceptorProfile) roles.push('PRECEPTOR');
    if (user.teacherProfile) roles.push('TEACHER');
    if (user.studentProfile) roles.push('STUDENT');
    return roles;
}