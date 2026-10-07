import { useState } from 'react';

import {
    useAssignmentOptions,
    useStudentsForCourse,
    useAssignStudent,
    useRemoveStudent,
} from '../hooks/useAssignments';

export default function StudentCourseAssignmentsView() {
    const {
        data: options,
        isLoading: optionsLoading,
    } = useAssignmentOptions();

    const [courseId, setCourseId] = useState('');

    const {
        data: students,
        isLoading: studentsLoading,
    } = useStudentsForCourse(courseId);

    const assignMutation = useAssignStudent();
    const removeMutation = useRemoveStudent();

    const handleToggle = (student) => {
        if (student.assigned) {
            removeMutation.mutate({
                studentId: student.id,
                courseId: Number(courseId),
            });

            return;
        }

        assignMutation.mutate({
            studentId: student.id,
            courseId: Number(courseId),
        });
    };

    if (optionsLoading) {
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
                    Alumnos por curso
                </h2>

                <p className="text-sm text-slate-400 mt-2">
                    Asigná alumnos a los cursos de la institución.
                </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
                <label className="block text-sm text-slate-400 mb-2">
                    Curso
                </label>

                <select
                    value={courseId}
                    onChange={(e) =>
                        setCourseId(e.target.value)
                    }
                    className="w-full max-w-md bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm cursor-pointer"
                >
                    <option value="">
                        Seleccioná un curso
                    </option>

                    {options?.courses?.map((course) => (
                        <option
                            key={course.id}
                            value={course.id}
                        >
                            {course.nombre}
                            {course.career
                                ? ` — ${course.career.nombre}`
                                : ''}
                        </option>
                    ))}
                </select>
            </div>

            {!courseId ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                    Seleccioná un curso para administrar sus alumnos.
                </div>
            ) : studentsLoading ? (
                <p className="text-slate-400">
                    Cargando alumnos...
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
                                <th>Estado</th>
                                <th className="text-right">
                                    Acción
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {students?.map((student) => (
                                <tr
                                    key={student.id}
                                    className="border-b border-slate-900 hover:bg-slate-900/50"
                                >
                                    <td className="py-3">
                                        {student.user.firstName}{' '}
                                        {student.user.lastName}
                                    </td>

                                    <td>
                                        {student.user.dni}
                                    </td>

                                    <td>
                                        {student.legajoStudent}
                                    </td>

                                    <td>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${student.user
                                                    .isActive
                                                    ? 'bg-emerald-600/20 text-emerald-400'
                                                    : 'bg-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {student.user.isActive
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                    </td>

                                    <td className="text-right">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggle(
                                                    student
                                                )
                                            }
                                            disabled={
                                                assignMutation.isPending ||
                                                removeMutation.isPending ||
                                                (!student.assigned &&
                                                    !student.user
                                                        .isActive)
                                            }
                                            className={`text-xs hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${student.assigned
                                                    ? 'text-red-400'
                                                    : 'text-emerald-400'
                                                }`}
                                        >
                                            {student.assigned
                                                ? 'Quitar'
                                                : 'Asignar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {students?.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-8 text-center text-slate-500"
                                    >
                                        No hay alumnos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}