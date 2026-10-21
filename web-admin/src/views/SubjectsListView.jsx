
import { useMemo, useState } from 'react';

import {
    useSubjectsAdmin,
    useCreateSubject,
    useUpdateSubject,
    useDeleteSubject,
} from '../hooks/useSubjectAdmin';

import SubjectFormModal from '../components/SubjectFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

const DAY_NAMES = {
    LUNES: 'Lunes',
    MARTES: 'Martes',
    MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves',
    VIERNES: 'Viernes',
    SABADO: 'Sábado',
};

const DAY_ORDER = {
    LUNES: 1,
    MARTES: 2,
    MIERCOLES: 3,
    JUEVES: 4,
    VIERNES: 5,
    SABADO: 6,
};

const SHIFT_NAMES = {
    MANANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
};

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.message ||
    fallback;

export default function SubjectsListView() {
    const {
        data: subjectsData = [],
        isLoading,
        isError,
        error,
    } = useSubjectsAdmin();

    const createMutation = useCreateSubject();
    const updateMutation = useUpdateSubject();
    const deleteMutation = useDeleteSubject();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [statusSubject, setStatusSubject] = useState(null);
    const [statusError, setStatusError] = useState('');

    const subjects = useMemo(() => {
        if (Array.isArray(subjectsData)) {
            return subjectsData;
        }

        return (
            subjectsData?.subjects ??
            subjectsData?.data ??
            []
        );
    }, [subjectsData]);

    const isSaving =
        createMutation.isPending ||
        updateMutation.isPending;

    const openCreate = () => {
        createMutation.reset();
        updateMutation.reset();
        setStatusError('');
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = subject => {
        createMutation.reset();
        updateMutation.reset();
        setStatusError('');
        setEditing(subject);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (isSaving) return;

        setFormOpen(false);
        setEditing(null);
        createMutation.reset();
        updateMutation.reset();
    };

    const handleSubmit = payload => {
        const action = payload.id
            ? updateMutation
            : createMutation;

        action.mutate(payload, {
            onSuccess: () => {
                setFormOpen(false);
                setEditing(null);
            },
        });
    };

    const handleDelete = () => {
        if (
            deletingId == null ||
            deleteMutation.isPending
        ) {
            return;
        }

        deleteMutation.mutate(deletingId, {
            onSuccess: () => {
                setDeletingId(null);
            },
        });
    };

    const openStatusDialog = subject => {
        if (updateMutation.isPending) return;

        updateMutation.reset();
        setStatusError('');
        setStatusSubject(subject);
    };

    const closeStatusDialog = () => {
        if (updateMutation.isPending) return;

        setStatusSubject(null);
        setStatusError('');
        updateMutation.reset();
    };

    const handleToggleStatus = () => {
        if (
            !statusSubject ||
            updateMutation.isPending
        ) {
            return;
        }

        const nextStatus = !statusSubject.isActive;

        updateMutation.mutate(
            {
                id: statusSubject.id,
                isActive: nextStatus,
            },
            {
                onSuccess: () => {
                    setStatusSubject(null);
                    setStatusError('');
                },
                onError: mutationError => {
                    setStatusError(
                        getErrorMessage(
                            mutationError,
                            'No se pudo cambiar el estado de la materia.'
                        )
                    );
                },
            }
        );
    };

    const formError =
        createMutation.error?.response?.data?.message ||
        updateMutation.error?.response?.data?.message ||
        createMutation.error?.message ||
        updateMutation.error?.message;

    const deleteError = getErrorMessage(
        deleteMutation.error,
        'No se pudo eliminar la materia.'
    );

    const renderSchedules = subject => {
        const schedules = [...(subject.schedules ?? [])].sort(
            (a, b) => {
                const dayDifference =
                    (DAY_ORDER[a.day] ?? 99) -
                    (DAY_ORDER[b.day] ?? 99);

                if (dayDifference !== 0) {
                    return dayDifference;
                }

                return String(a.startTime ?? '').localeCompare(
                    String(b.startTime ?? '')
                );
            }
        );

        if (schedules.length === 0) {
            return (
                <span className="text-slate-500">
                    Sin horarios asignados
                </span>
            );
        }

        const groupedSchedules = schedules.reduce(
            (groups, schedule) => {
                const courseId =
                    schedule.courseId ??
                    schedule.course?.id ??
                    'unknown';

                const courseName =
                    schedule.course?.nombre ??
                    'Curso no disponible';

                const groupKey = String(courseId);

                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        courseName,
                        schedules: [],
                    };
                }

                groups[groupKey].schedules.push(schedule);

                return groups;
            },
            {}
        );

        return (
            <div className="space-y-3">
                {Object.entries(groupedSchedules).map(
                    ([courseId, group]) => (
                        <div
                            key={courseId}
                            className="space-y-1"
                        >
                            {Object.keys(groupedSchedules).length > 1 && (
                                <p className="text-xs font-semibold text-blue-300">
                                    {group.courseName}
                                </p>
                            )}

                            {group.schedules.map(schedule => (
                                <div
                                    key={schedule.id}
                                    className="rounded-md border border-slate-700/60 bg-slate-800/40 px-2.5 py-2"
                                >
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-medium text-slate-200">
                                            {DAY_NAMES[schedule.day] ??
                                                schedule.day}
                                        </span>

                                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-300">
                                            {SHIFT_NAMES[schedule.shift] ??
                                                schedule.shift}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-xs text-slate-400">
                                        {schedule.startTime} a{' '}
                                        {schedule.endTime} hs
                                    </p>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Materias
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Administrá las materias, sus docentes,
                        horarios y disponibilidad.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreate}
                    className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    + Agregar materia
                </button>
            </div>

            {isError && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
                >
                    {getErrorMessage(
                        error,
                        'No se pudieron cargar las materias.'
                    )}
                </div>
            )}

            {deleteMutation.isError && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
                >
                    {deleteError}
                </div>
            )}

            {statusError && !statusSubject && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
                >
                    {statusError}
                </div>
            )}

            {isLoading ? (
                <p className="text-sm text-slate-400">
                    Cargando materias...
                </p>
            ) : !isError ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/70 text-left text-slate-400">
                                <th className="px-4 py-3 font-medium">
                                    Materia
                                </th>

                                <th className="px-4 py-3 font-medium">
                                    Docente responsable
                                </th>

                                <th className="px-4 py-3 font-medium">
                                    Curso
                                </th>

                                <th className="px-4 py-3 font-medium">
                                    Días, turnos y horarios
                                </th>

                                <th className="px-4 py-3 font-medium">
                                    Estado
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {subjects.map(subject => {
                                const activeAssignments =
                                    (subject.teachers ?? []).filter(
                                        assignment =>
                                            assignment.isActive
                                    );

                                const isActive =
                                    subject.isActive !== false;

                                return (
                                    <tr
                                        key={subject.id}
                                        className={`border-b border-slate-800/70 transition last:border-b-0 hover:bg-slate-800/40 ${!isActive
                                                ? 'opacity-45 hover:opacity-75'
                                                : ''
                                            }`}
                                    >
                                        <td className="px-4 py-4 align-top">
                                            <div className="font-medium text-white">
                                                {subject.nombre}
                                            </div>

                                            {subject.institution?.nombre && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {subject.institution.nombre}
                                                </p>
                                            )}
                                        </td>

                                        <td className="px-4 py-4 align-top">
                                            {activeAssignments.length > 0 ? (
                                                <div className="space-y-2">
                                                    {activeAssignments.map(
                                                        assignment => (
                                                            <div
                                                                key={assignment.id}
                                                                className="text-slate-200"
                                                            >
                                                                {assignment.teacher?.user?.firstName ||
                                                                    ''}{' '}
                                                                {assignment.teacher?.user?.lastName ||
                                                                    ''}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">
                                                    Sin docente asignado
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-4 align-top">
                                            {activeAssignments.length > 0 ? (
                                                <div className="space-y-2">
                                                    {activeAssignments.map(
                                                        assignment => (
                                                            <div
                                                                key={assignment.id}
                                                                className="text-slate-300"
                                                            >
                                                                {assignment.course?.nombre ||
                                                                    'Curso no disponible'}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        <td className="min-w-[230px] px-4 py-4 align-top">
                                            {renderSchedules(subject)}
                                        </td>

                                        <td className="px-4 py-4 align-top">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${isActive
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-slate-700 text-slate-300'
                                                    }`}
                                            >
                                                {isActive
                                                    ? 'Activa'
                                                    : 'Inactiva'}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4 text-right align-top">
                                            <div className="flex flex-wrap justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEdit(subject)
                                                    }
                                                    className="cursor-pointer text-xs font-medium text-blue-400 transition hover:text-blue-300 hover:underline"
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openStatusDialog(subject)
                                                    }
                                                    disabled={
                                                        updateMutation.isPending
                                                    }
                                                    className={`cursor-pointer text-xs font-medium transition hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${isActive
                                                            ? 'text-amber-400 hover:text-amber-300'
                                                            : 'text-emerald-400 hover:text-emerald-300'
                                                        }`}
                                                >
                                                    {isActive
                                                        ? 'Desactivar'
                                                        : 'Activar'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        deleteMutation.reset();
                                                        setDeletingId(
                                                            subject.id
                                                        );
                                                    }}
                                                    className="cursor-pointer text-xs font-medium text-red-400 transition hover:text-red-300 hover:underline"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {subjects.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-10 text-center text-slate-500"
                                    >
                                        Todavía no hay materias registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}

            <SubjectFormModal
                open={formOpen}
                initialData={editing}
                onSubmit={handleSubmit}
                onClose={closeForm}
                isSaving={isSaving}
                formError={formError}
            />

            <ConfirmDialog
                open={deletingId != null}
                title="Eliminar materia"
                message="Esta acción no se puede deshacer. Si la materia tiene asignaciones u horarios, deberás desactivarla en lugar de eliminarla. ¿Confirmás que querés eliminarla?"
                confirmLabel={
                    deleteMutation.isPending
                        ? 'Eliminando...'
                        : 'Eliminar'
                }
                onCancel={() => {
                    if (!deleteMutation.isPending) {
                        setDeletingId(null);
                        deleteMutation.reset();
                    }
                }}
                onConfirm={handleDelete}
            />

            <ConfirmDialog
                open={statusSubject != null}
                title={
                    statusSubject?.isActive === false
                        ? 'Activar materia'
                        : 'Desactivar materia'
                }
                message={
                    statusSubject?.isActive === false
                        ? `¿Querés activar nuevamente la materia "${statusSubject?.nombre}"? Volverá a estar disponible y conservará sus datos.`
                        : `¿Querés desactivar la materia "${statusSubject?.nombre}"? No se eliminará de la base de datos y podrás reactivarla cuando quieras.`
                }
                confirmLabel={
                    updateMutation.isPending
                        ? 'Guardando...'
                        : statusSubject?.isActive === false
                            ? 'Activar'
                            : 'Desactivar'
                }
                onCancel={closeStatusDialog}
                onConfirm={handleToggleStatus}
            />

            {statusSubject && statusError && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
                >
                    {statusError}
                </div>
            )}
        </div>
    );
}
