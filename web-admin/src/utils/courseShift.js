export const SHIFTS = [
  { value: 'MANANA', label: 'Mañana' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOCHE', label: 'Noche' },
];
export const shiftLabel = (shift) => SHIFTS.find(item => item.value === shift)?.label ?? 'Turno por definir';
export const courseLabel = course => `${course?.nombre ?? 'Curso'} · ${shiftLabel(course?.shift)}${course?.academicYear ? ` · ${course.academicYear}` : ''}`;
export const coursesByShift = (courses, shift) => !shift ? courses : (courses ?? []).filter(course => course.shift === shift);
