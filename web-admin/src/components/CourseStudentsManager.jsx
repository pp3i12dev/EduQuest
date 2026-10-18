
import { useMemo, useState } from 'react';
import {
    UserRoundPlus,
    UserRoundMinus,
    Users,
    CheckCircle2,
} from 'lucide-react';

import {
    useStudentsForCourse,
    useAssignStudent,
    useRemoveStudent,
} from '../hooks/useAssignments';

import SearchInput from './SearchInput';

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo completar la operación.'
    );
}

export default function CourseStudentsManager({ course }) {
    const courseId = course?.id;

    const {
        data: students = [],
        isLoading,
        isError,
        error,
    } = useStudentsForCourse(courseId);

    const assignMutation = useAssignStudent();
    const removeMutation = useRemoveStudent();

    const [search, setSearch] = useState('');
    const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);
    const [actionError, setActionError] = useState('');
    const [busyStudentId, setBusyStudentId] = useState(null);

    const filteredStudents = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('es');

        return students
            .filter((student) => {
                if (showOnlyAssigned && !student.assigned) {
                    return false;
                }

                const user = student.user ?? {};

                const searchable = [
                    user.firstName,
                    user.lastName,
                    `${user.firstName ?? ''} ${user.lastName ?? ''}`,
                    user.dni,
                    user.email,
                    user.telefono,
                    student.legajoStudent,
                ]
                    .filter((value) => value != null)
                    .join(' ')
                    .toLocaleLowerCase('es');

                return searchable.includes(term);
            })
            .sort((a, b) => {
                if (a.assigned !== b.assigned) {
                    return a.assigned ? -1 : 1;
                }

                const nameA =
                    `${a.user?.lastName ?? ''} ${a.user?.firstName ?? ''}`;
                const nameB =
                    `${b.user?.lastName ?? ''} ${b.user?.firstName ?? ''}`;

                return nameA.localeCompare(nameB, 'es');
            });
    }, [students, search, showOnlyAssigned]);

    const assignedCount = students.filter(
        (student) => student.assigned
    ).length;

    const handleAssign = (student) => {
        if (!courseId) return;

        setActionError('');
        setBusyStudentId(student.id);

        assignMutation.mutate(
            {
                studentId: student.id,
                courseId,
            },
            {
                onSuccess: () => setBusyStudentId(null),
                onError: (mutationError) => {
                    setActionError(getErrorMessage(mutationError));
                    setBusyStudentId(null);
                },
            }
        );
    };

    const handleRemove = (student) => {
        if (!courseId) return;

        setActionError('');
        setBusyStudentId(student.id);

        removeMutation.mutate(
            {
                studentId: student.id,
                courseId,
            },
            {
                onSuccess: () => setBusyStudentId(null),
                onError: (mutationError) => {
                    setActionError(getErrorMessage(mutationError));
                    setBusyStudentId(null);
                },
            }
        );
    };

    if (!courseId) {
        return null;
    }

    return (
        <section className="space-y-5 rounded-xl border border-slate-700 bg-slate-900/90 p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Users size={21} className="text-blue-400" />
                        Alumnos del curso
                    </h3>

                    <p className="mt-1 text-sm text-slate-300">
                        {course.nombre}
                        {course.career?.nombre
                            ? ` — ${course.career.nombre}`
                            : ''}
                    </p>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-blue-300">
                        {assignedCount}
                    </p>
                    <p className="text-xs text-slate-300">
                        Alumnos asignados
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por nombre, apellido, DNI, email o legajo..."
                />

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                        type="checkbox"
                        checked={showOnlyAssigned}
                        onChange={(event) =>
                            setShowOnlyAssigned(event.target.checked)
                        }
                        className="cursor-pointer accent-blue-600"
                    />
                    Mostrar solo asignados
                </label>
            </div>

            {actionError && (
                <p role="alert" className="text-sm text-red-400">
                    {actionError}
                </p>
            )}

            {isError && (
                <p role="alert" className="text-sm text-red-400">
                    {getErrorMessage(error)}
                </p>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                        <tr>
                            <th className="px-4 py-3">Alumno</th>
                            <th className="px-4 py-3">DNI</th>
                            <th className="px-4 py-3">Legajo</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Cargando alumnos...
                                </td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    No se encontraron alumnos.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student) => {
                                const user = student.user ?? {};
                                const isBusy = busyStudentId === student.id;

                                return (
                                    <tr
                                        key={student.id}
                                        className="hover:bg-slate-800/40"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {user.firstName} {user.lastName}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {user.email}
                                            </p>
                                        </td>

                                        <td className="px-4 py-3">
                                            {user.dni || '—'}
                                        </td>

                                        <td className="px-4 py-3">
                                            {student.legajoStudent || '—'}
                                        </td>

                                        <td className="px-4 py-3">
                                            {student.assigned ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">
                                                    <CheckCircle2 size={14} />
                                                    Asignado
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300">
                                                    Sin asignar
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            {student.assigned ? (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleRemove(student)}
                                                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-500/50 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <UserRoundMinus size={16} />
                                                    Quitar
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleAssign(student)}
                                                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <UserRoundPlus size={16} />
                                                    Agregar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
