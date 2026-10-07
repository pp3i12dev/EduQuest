import { useState } from 'react';

import {
    useAssignmentOptions,
    useTeachersForCourseSubject,
    useAssignTeacher,
    useRemoveTeacher,
} from '../hooks/useAssignments';

export default function TeacherSubjectAssignmentsView() {
    const { data: options, isLoading } =
        useAssignmentOptions();

    const [courseId, setCourseId] = useState('');
    const [subjectId, setSubjectId] = useState('');

    const {
        data: teachers,
        isLoading: teachersLoading,
    } = useTeachersForCourseSubject(
        courseId,
        subjectId
    );

    const assignMutation = useAssignTeacher();
    const removeMutation = useRemoveTeacher();

    const handleToggle = (teacher) => {
        if (teacher.assigned) {
            removeMutation.mutate(
                teacher.assignmentId
            );

            return;
        }

        assignMutation.mutate({
            teacherId: teacher.id,
            subjectId: Number(subjectId),
            courseId: Number(courseId),
        });
    };

    if (isLoading) {
        return (
            <p className="text-slate-400">
                Cargando...
            </p>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">
                    Docentes y materias
                </h2>

                <p className="text-sm text-slate-400 mt-2">
                    Relacioná docentes con materias y cursos.
                </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Curso
                        </label>

                        <select
                            value={courseId}
                            onChange={(e) => {
                                setCourseId(
                                    e.target.value
                                );
                                setSubjectId('');
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm cursor-pointer"
                        >
                            <option value="">
                                Seleccioná un curso
                            </option>

                            {options?.courses?.map(
                                (course) => (
                                    <option
                                        key={course.id}
                                        value={course.id}
                                    >
                                        {course.nombre}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Materia
                        </label>

                        <select
                            value={subjectId}
                            onChange={(e) =>
                                setSubjectId(
                                    e.target.value
                                )
                            }
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm cursor-pointer"
                        >
                            <option value="">
                                Seleccioná una materia
                            </option>

                            {options?.subjects?.map(
                                (subject) => (
                                    <option
                                        key={subject.id}
                                        value={subject.id}
                                    >
                                        {subject.nombre}
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {!courseId || !subjectId ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                    Seleccioná un curso y una materia.
                </div>
            ) : teachersLoading ? (
                <p className="text-slate-400">
                    Cargando docentes...
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-800">
                                <th className="py-3">
                                    Nombre
                                </th>
                                <th>DNI</th>
                                <th>Legajo</th>
                                <th>Especialidad</th>
                                <th>Estado</th>
                                <th className="text-right">
                                    Acción
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {teachers?.map((teacher) => (
                                <tr
                                    key={teacher.id}
                                    className="border-b border-slate-900 hover:bg-slate-900/50"
                                >
                                    <td className="py-3">
                                        {teacher.user.firstName}{' '}
                                        {teacher.user.lastName}
                                    </td>

                                    <td>
                                        {teacher.user.dni}
                                    </td>

                                    <td>
                                        {teacher.legajoTeacher}
                                    </td>

                                    <td>
                                        {teacher.specialty ||
                                            '—'}
                                    </td>

                                    <td>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${teacher.user
                                                    .isActive
                                                    ? 'bg-emerald-600/20 text-emerald-400'
                                                    : 'bg-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {teacher.user.isActive
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                    </td>

                                    <td className="text-right">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggle(
                                                    teacher
                                                )
                                            }
                                            disabled={
                                                assignMutation.isPending ||
                                                removeMutation.isPending ||
                                                (!teacher.assigned &&
                                                    !teacher.user
                                                        .isActive)
                                            }
                                            className={`text-xs hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${teacher.assigned
                                                    ? 'text-red-400'
                                                    : 'text-emerald-400'
                                                }`}
                                        >
                                            {teacher.assigned
                                                ? 'Quitar'
                                                : 'Asignar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}