import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const mockedDb = {};
const context = vm.createContext({ console, Map, Set, Number, Date, Intl, Math, Array, Object, String, Boolean, Error, Promise });
const prismaMock = new vm.SyntheticModule(['getPrisma'], function () {
  this.setExport('getPrisma', () => mockedDb);
}, { context });
const rankingSource = await fs.readFile(path.join(root, 'backend/src/services/leaderboard.service.js'), 'utf8');
const assessmentSource = await fs.readFile(path.join(root, 'backend/src/services/assessment.service.js'), 'utf8');
const utilSource = await fs.readFile(path.join(root, 'backend/src/utils/leaderboardRanking.js'), 'utf8');
const utility = new vm.SourceTextModule(utilSource, { context });
await utility.link(() => { throw new Error('Unexpected import in utility'); });
await utility.evaluate();
const rankMock = new vm.SyntheticModule(['rankStudents'], function () {
  this.setExport('rankStudents', utility.namespace.rankStudents);
}, { context });
async function load(src) {
  const module = new vm.SourceTextModule(src, { context });
  await module.link(async name => {
    if (name.endsWith('/config/prisma.js')) return prismaMock;
    if (name.endsWith('/utils/leaderboardRanking.js')) return rankMock;
    throw new Error('Unexpected import ' + name);
  });
  await module.evaluate();
  return module.namespace;
}
const assessment = await load(assessmentSource);
const leaderboard = await load(rankingSource);

const requester = { id: 11, institutionId: 1 };
let found = false;
function fakeAttempt(i) {
  const activityId = i % 2 ? 5 : 6;
  return {
    id: i, isCompleted: true, studentId: i % 2 ? 100 : 200, activityId,
    activityNameSnapshot: activityId === 5 ? 'VF' : 'Multiples',
    student: { user: { firstName: 'Alumno', lastName: String(i) } },
    activity: { teacherSubjectId: 99, title: activityId === 5 ? 'VF' : 'Multiples',
      teacherSubject: { course: { nombre: 'Tercero' }, subject: { nombre: 'Testing' } },
      topic: { title: 'Tema', unit: { title: 'Unidad' } },
    },
    score: 75, earnedPoints: 40, timeInSec: 30, createdAt: new Date(2026, 9, 1),
  };
}
const all = Array.from({ length: 130 }, (_, i) => fakeAttempt(i + 1));
function matching(where) {
  return all.filter(r => (!where.studentId || where.studentId === r.studentId) &&
    (!where.activityId || where.activityId === r.activityId));
}
mockedDb.teacherProfile = { findUnique: async () => ({ id: 7 }) };
mockedDb.teacherSubject = {
  findFirst: async args => {
    assert.equal(args.where.teacherId, 7);
    assert.equal(args.where.course.institutionId, requester.institutionId);
    return { id: args.where.id, course: { id: 10, nombre: 'Tercero' }, subject: { nombre: 'Testing' } };
  },
  findMany: async () => [{ id: 99, subject: { nombre: 'Testing' } }],
};
mockedDb.gameAttempt = {
  count: async ({ where }) => matching(where).length,
  findMany: async ({ where, skip = 0, take }) => matching(where).slice(skip, skip + take),
  groupBy: async () => [
    { activityId: 5, studentId: 100, _count: { _all: 65 } },
    { activityId: 6, studentId: 200, _count: { _all: 65 } },
  ],
  findUnique: async ({ where }) => fakeAttempt(where.id),
  findFirst: async () => ({ id: 1 }),
  delete: async () => { throw new Error('Should not delete competitive attempt'); },
};
mockedDb.activity = { findMany: async () => [{ id: 5, title: 'VF' }, { id: 6, title: 'Multiples' }] };
mockedDb.studentProfile = {
  findMany: async () => [
    { id: 100, user: { firstName: 'Ana', lastName: 'P' } },
    { id: 200, user: { firstName: 'Juan', lastName: 'G' } },
  ],
  findUnique: async () => ({ puntosTotales: 80 }),
};
mockedDb.$transaction = async fn => fn(mockedDb);
mockedDb.course = {
  findUnique: async () => ({ id: 10, nombre: 'Tercero', academicYear: 2026, institutionId: 1,
    students: [
      { studentId: 100, student: { user: { firstName: 'Ana', lastName: 'P', isActive: true } } },
      { studentId: 200, student: { user: { firstName: 'Juan', lastName: 'G', isActive: true } } },
    ] }),
};

const page1 = await assessment.list(requester, 99, { page: '1', pageSize: '50' });
assert.equal(page1.records.length, 50);
assert.equal(page1.pagination.total, 130);
assert.equal(page1.pagination.totalPages, 3);
const page3 = await assessment.list(requester, 99, { page: '3', pageSize: '50' });
assert.equal(page3.records.length, 30);
assert.equal(page3.pagination.page, 3);
const query = await assessment.list(requester, 99, { page: '1', studentId: '100', activityId: '5' });
assert.equal(query.pagination.total, 65);
assert(query.records.every(row => row.studentId === 100 && row.activityId === 5));
await assert.rejects(() => assessment.list(requester, 99, { pageSize: '101' }), /Máximo 100/);

const filters = await assessment.filters(requester, 99);
assert.equal(filters.activities.length, 2);
assert.equal(filters.activities[0].studentCount, 1);
assert.equal(filters.students.length, 2);
assert.equal(filters.students[0].name, 'Ana P');

await assert.rejects(() => assessment.removePermanently(requester, 1, { confirm: 'BORRAR' }), /primer intento competitivo/);

// Misma asignación: no se filtra el acceso histórico por isActive, pero el ranking actual
// seguirá vacío cuando se archive la materia.
mockedDb.gameAttempt.findMany = async () => [
  { studentId: 100, activityId: 5, score: 20 },
  { studentId: 100, activityId: 5, score: 99 },
  { studentId: 200, activityId: 5, score: 70 },
];
mockedDb.activity.findMany = async () => [{ id: 5, title: 'VF', teacherSubjectId: 99, pointsAwarded: 100 }];
const ranking = await leaderboard.forTeacher(requester, 99, 5);
assert.equal(ranking.subjectName, 'Testing');
assert.equal(ranking.activityName, 'VF');
const ana = ranking.rows.find(row => row.studentId === 100);
const juan = ranking.rows.find(row => row.studentId === 200);
assert.equal(ana.score, 20); // NO toma el segundo intento (99%).
assert.equal(juan.position, 1);
assert.equal(ana.position, 2);
console.log('OK: paginación real, filtro global, opciones del historial, primer intento protegido, ranking docente por materia y primer intento.');
