import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read = file => fs.readFile(new URL(file, import.meta.url), 'utf8');
const helper = await read('../web-admin/src/utils/subjectHierarchy.js');
const {
    careersForInstitution, coursesForCareer, subjectsForSelection,
    getSubjectCourseIds,
} = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(helper));

const careers = [
    { id: 11, institutionId: 1, nombre: 'Informática' },
    { id: 12, institutionId: 1, nombre: 'Educación Física' },
    { id: 21, institutionId: 2, nombre: 'Informática' },
];
const courses = [
    { id: 101, institutionId: 1, careerId: 11, nombre: '3.º A' },
    { id: 102, institutionId: 1, careerId: 11, nombre: '2.º A' },
    { id: 103, institutionId: 1, careerId: 12, nombre: '1.º B' },
    { id: 201, institutionId: 2, careerId: 21, nombre: '1.º A' },
    { id: 104, institutionId: 1, careerId: null, nombre: 'Sin carrera' },
];
const subjects = [
    { id: 1, institutionId: 1, nombre: 'Testing', teachers: [{ isActive: true, courseId: 101 }] },
    { id: 2, institutionId: 1, nombre: 'Programación', teachers: [{ isActive: true, courseId: 101 }, { isActive: true, courseId: 102 }] },
    { id: 3, institutionId: 1, nombre: 'Deporte', teachers: [{ isActive: true, courseId: 103 }] },
    { id: 4, institutionId: 2, nombre: 'Inglés', teachers: [{ isActive: true, courseId: 201 }] },
    { id: 5, institutionId: 1, nombre: 'Sistemas', teachers: [{ isActive: false, courseId: 102 }], schedules: [{ courseId: 102 }] },
];
assert.deepEqual(careersForInstitution(careers, 1).map(c => c.id), [11, 12]);
assert.deepEqual(careersForInstitution(careers, 2).map(c => c.id), [21]);
assert.deepEqual(coursesForCareer(courses, 1, 11).map(c => c.id), [101, 102]);
assert.deepEqual(coursesForCareer(courses, 1, 21), []);
assert.deepEqual(coursesForCareer(courses, 1, ''), []);
assert.deepEqual(subjectsForSelection(subjects, courses, { institutionId: 1, careerId: '', courseId: '' }).map(s=>s.id), [1, 2, 3, 5]);
assert.deepEqual(subjectsForSelection(subjects, courses, { institutionId: 1, careerId: 11, courseId: '' }).map(s=>s.id), [1, 2, 5]);
assert.deepEqual(subjectsForSelection(subjects, courses, { institutionId: 1, careerId: 11, courseId: 101 }).map(s=>s.id), [1, 2]);
assert.deepEqual(subjectsForSelection(subjects, courses, { institutionId: 1, careerId: 11, courseId: 102 }).map(s=>s.id), [2, 5]);
assert.deepEqual(subjectsForSelection(subjects, courses, { institutionId: 2, careerId: 21, courseId: '' }).map(s=>s.id), [4]);
assert.deepEqual(getSubjectCourseIds(subjects[4]), [102]);

// Backend: carrera/curso/institución son obligatoriamente consistentes.
const service = await read('../backend/src/services/subject.service.js');
const repository = await read('../backend/src/repositories/subject.repository.js');
assert.match(service, /const careerId = parsePositiveId\(/);
assert.match(repository, /careerId,\s+career: \{ institutionId \}/);
assert.match(repository, /careerId,\s+career: \{ institutionId: subject\.institutionId \}/);
assert.match(repository, /where: \{ id: previousAssignmentId \},\s+data: \{ isActive: false \}/);
console.log('OK: filtros por institución/carrera/curso, materias multiciurso, historial de horarios y validaciones jerárquicas.');
