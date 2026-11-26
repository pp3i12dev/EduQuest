// Cálculo puro: mejores notas por (alumno, actividad), sin premiar el spam de intentos.
// La puntuación general usa TODAS las actividades activas del curso como denominador.
export function rankStudents({ students = [], activities = [], attempts = [], activityId = null }) {
  const activityIds = new Set(activities.map(x => x.id));
  const awards = new Map(activities.map(x => [x.id, Number(x.pointsAwarded) || 0]));
  const eligible = new Set(students.map(x => x.id));
  const best = new Map();
  for (const a of attempts) {
    if (!eligible.has(a.studentId) || !activityIds.has(a.activityId)) continue;
    const key = `${a.studentId}:${a.activityId}`;
    const score = Math.max(0, Math.min(100, Number(a.score) || 0));
    best.set(key, Math.max(best.get(key) ?? -1, score));
  }
  const selectedIds = activityId != null ? [activityId] : activities.map(a => a.id);
  const rows = students.map(student => {
    const scores = selectedIds.map(id => best.get(`${student.id}:${id}`));
    const completedCount = scores.filter(v => v !== undefined).length;
    const points = Math.round(selectedIds.reduce((sum, id) => sum + ((best.get(`${student.id}:${id}`) ?? 0) / 100) * (awards.get(id) || 0), 0));
    const score = selectedIds.length
      ? Math.round(scores.reduce((sum, n) => sum + (n ?? 0), 0) / selectedIds.length * 10) / 10
      : 0;
    return {
      studentId: student.id,
      name: student.name,
      score,
      points,
      grade: Math.round(score) / 10,
      completedCount,
      totalActivities: selectedIds.length,
      coverage: selectedIds.length ? Math.round(completedCount * 100 / selectedIds.length) : 0,
      position: null,
    };
  });
  rows.sort((a, b) => b.score - a.score || b.completedCount - a.completedCount ||
    a.name.localeCompare(b.name, 'es') || a.studentId - b.studentId);
  let last = null;
  rows.forEach((r, i) => {
    if (!r.completedCount) return;
    const tieKey = `${r.score}:${r.completedCount}`;
    r.position = tieKey === last?.key ? last.position : i + 1;
    last = { key: tieKey, position: r.position };
  });
  return rows;
}
