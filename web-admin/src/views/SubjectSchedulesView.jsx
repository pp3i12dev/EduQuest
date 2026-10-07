import { useState } from 'react';

import {
    useAssignmentOptions,
    useSchedules,
    useCreateSchedule,
    useUpdateSchedule,
    useDeleteSchedule,
} from '../hooks/useAssignments';

import ConfirmDialog from '../components/ConfirmDialog';

const DAYS = [
    ['LUNES', 'Lunes'],
    ['MARTES', 'Martes'],
    ['MIERCOLES', 'Miércoles'],
    ['JUEVES', 'Jueves'],
    ['VIERNES', 'Viernes'],
    ['SABADO', 'Sábado'],
];

const SHIFTS = [
    ['MANANA', 'Mañana'],
    ['TARDE', 'Tarde'],
    ['NOCHE', 'Noche'],
];

const EMPTY_FORM = {
    day: 'LUNES',
    shift: 'MANANA',
    startTime: '',
    endTime: '',
};

export default function SubjectSchedulesView() {
    const { data: options, isLoading } =
        useAssignmentOptions();

    const [courseId, setCourseId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const {
        data: schedules,
        isLoading: schedulesLoading,
    } = useSchedules(courseId, subjectId);

    const createMutation = useCreateSchedule();
    const updateMutation = useUpdateSchedule();
    const deleteMutation = useDeleteSchedule();

    const handleChange = (e) => {
        setForm((current) => ({
            ...current,
            [e.target.name]: e.target.value,
        }));
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!courseId || !subjectId) {
            return;
        }

        const payload = {
            courseId: Number(courseId),
            subjectId: Number(subjectId),
            ...form,
        };

        if (editingId) {
            updateMutation.mutate(
                {
                    id: editingId,
                    ...payload,
                },
                {
                    onSuccess: resetForm,
                }
            );
        } else {
            createMutation.mutate(
                payload,
                {
                    onSuccess: resetForm,
                }
            );
        }
    };

    const startEdit = (schedule) => {
        setEditingId(schedule.id);

        setForm({
            day: schedule.day,
            shift: schedule.shift,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
        });
    };

    const dayLabel = (value) =>
        DAYS.find(([key]) => key === value)?.[1] ??
        value;

    const shiftLabel = (value) =>
        SHIFTS.find(([key]) => key === value)?.[1] ??
        value;

    if (isLoading) {
        return (
            <p className="text-slate-400">
                Cargando...
            </p>
        );
    }

    const saving =
        createMutation.isPending ||
        updateMutation.isPending;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">
                    Horarios y turnos
                </h2>

                <p className="text-sm text-slate-400 mt-2">
                    Configurá los días, turnos y horarios de
                    cada materia dentro de cada curso.
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
                                resetForm();
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
                            onChange={(e) => {
                                setSubjectId(
                                    e.target.value
                                );
                                resetForm();
                            }}
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

            {courseId && subjectId && (
                <>
                    <form
                        onSubmit={handleSubmit}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">
                                {editingId
                                    ? 'Editar horario'
                                    : 'Agregar horario'}
                            </h3>

                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                                >
                                    Cancelar edición
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">
                                    Día
                                </label>

                                <select
                                    name="day"
                                    value={form.day}
                                    onChange={
                                        handleChange
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm cursor-pointer"
                                >
                                    {DAYS.map(
                                        ([key, label]) => (
                                            <option
                                                key={key}
                                                value={key}
                                            >
                                                {label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-2">
                                    Turno
                                </label>

                                <select
                                    name="shift"
                                    value={form.shift}
                                    onChange={
                                        handleChange
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm cursor-pointer"
                                >
                                    {SHIFTS.map(
                                        ([key, label]) => (
                                            <option
                                                key={key}
                                                value={key}
                                            >
                                                {label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-2">
                                    Desde
                                </label>

                                <input
                                    type="time"
                                    name="startTime"
                                    value={
                                        form.startTime
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-2">
                                    Hasta
                                </label>

                                <input
                                    type="time"
                                    name="endTime"
                                    value={
                                        form.endTime
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="mt-4 bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving
                                ? 'Guardando...'
                                : editingId
                                    ? 'Guardar cambios'
                                    : '+ Agregar horario'}
                        </button>
                    </form>

                    {schedulesLoading ? (
                        <p className="text-slate-400">
                            Cargando horarios...
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-400 border-b border-slate-800">
                                        <th className="py-3">
                                            Día
                                        </th>
                                        <th>
                                            Turno
                                        </th>
                                        <th>
                                            Desde
                                        </th>
                                        <th>
                                            Hasta
                                        </th>
                                        <th className="text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {schedules?.map(
                                        (schedule) => (
                                            <tr
                                                key={
                                                    schedule.id
                                                }
                                                className="border-b border-slate-900"
                                            >
                                                <td className="py-3">
                                                    {dayLabel(
                                                        schedule.day
                                                    )}
                                                </td>

                                                <td>
                                                    {shiftLabel(
                                                        schedule.shift
                                                    )}
                                                </td>

                                                <td>
                                                    {
                                                        schedule.startTime
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        schedule.endTime
                                                    }
                                                </td>

                                                <td className="text-right space-x-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEdit(
                                                                schedule
                                                            )
                                                        }
                                                        className="text-blue-400 hover:underline text-xs cursor-pointer"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeletingId(
                                                                schedule.id
                                                            )
                                                        }
                                                        className="text-red-400 hover:underline text-xs cursor-pointer"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}

                                    {schedules?.length ===
                                        0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="py-8 text-center text-slate-500"
                                                >
                                                    No hay horarios
                                                    configurados.
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {!courseId || !subjectId ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                    Seleccioná un curso y una materia para
                    administrar sus horarios.
                </div>
            ) : null}

            <ConfirmDialog
                open={Boolean(deletingId)}
                title="Eliminar horario"
                message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar"
                onCancel={() =>
                    setDeletingId(null)
                }
                onConfirm={() =>
                    deleteMutation.mutate(
                        deletingId,
                        {
                            onSuccess: () =>
                                setDeletingId(null),
                        }
                    )
                }
            />
        </div>
    );
}