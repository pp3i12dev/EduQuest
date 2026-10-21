import {
    useState,
    useEffect,
    useMemo,
    useContext,
} from 'react';

import { useQuery } from '@tanstack/react-query';

import { AuthContext } from '../context/AuthContext';
import { useCoursesAdmin } from '../hooks/useCourseAdmin';
import { useInstitutions } from '../hooks/useInstitution';
import { usersService } from '../services/users.service';

const EMPTY_FORM = {
    nombre: '',
    institutionId: '',
    teacherId: '',
    courseId: '',
};

const DAYS = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
];

const SHIFTS = ['MANANA', 'TARDE', 'NOCHE'];

const DAY_NAMES = {
    LUNES: 'Lunes',
    MARTES: 'Martes',
    MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves',
    VIERNES: 'Viernes',
    SABADO: 'Sábado',
};

const SHIFT_NAMES = {
    MANANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
};

const newSchedule = () => ({
    day: 'LUNES',
    shift: 'MANANA',
    startTime: '08:00',
    endTime: '09:00',
});

const schedulesForCourse = (subject, courseId) =>
    (subject?.schedules ?? [])
        .filter(
            schedule =>
                Number(schedule.courseId) === Number(courseId)
        )
        .map(({ id, day, shift, startTime, endTime }) => ({
            id,
            day,
            shift,
            startTime,
            endTime,
        }));

export default function SubjectFormModal({
    open,
    initialData,
    onSubmit,
    onClose,
    isSaving,
    formError,
}) {
    const { user } = useContext(AuthContext);

    const isEditing = Boolean(initialData);

    const isSuperAdmin =
        user?.isSuperAdmin === true ||
        user?.roles?.includes('SUPER_ADMIN');

    const {
        data: institutionsData = [],
        isLoading: institutionsLoading,
    } = useInstitutions(open && isSuperAdmin);

    const institutions = useMemo(() => {
        if (Array.isArray(institutionsData)) {
            return institutionsData;
        }

        return (
            institutionsData?.institutions ??
            institutionsData?.data ??
            []
        );
    }, [institutionsData]);

    const { data: coursesData = [] } = useCoursesAdmin();

    const courses = useMemo(() => {
        if (Array.isArray(coursesData)) {
            return coursesData;
        }

        return coursesData?.courses ?? coursesData?.data ?? [];
    }, [coursesData]);

    const { data: teachersData = [] } = useQuery({
        queryKey: ['subject-teachers'],
        queryFn: () => usersService.list('teacher'),
        enabled: open,
    });

    const teachers = useMemo(() => {
        if (Array.isArray(teachersData)) {
            return teachersData;
        }

        return teachersData?.users ?? teachersData?.data ?? [];
    }, [teachersData]);

    const [form, setForm] = useState(EMPTY_FORM);
    const [schedules, setSchedules] = useState([]);
    const [scheduleError, setScheduleError] = useState('');

    const activeAssignments = useMemo(() => {
        return (initialData?.teachers ?? []).filter(
            assignment => assignment.isActive
        );
    }, [initialData]);

    const assignedCourseIds = useMemo(() => {
        return new Set(
            activeAssignments.map(
                assignment => assignment.courseId
            )
        );
    }, [activeAssignments]);

    useEffect(() => {
        if (!open) return;

        const firstAssignment =
            (initialData?.teachers ?? []).find(
                assignment => assignment.isActive
            ) ?? null;

        const initialInstitutionId =
            initialData?.institutionId ??
            user?.institutionId ??
            '';

        setForm({
            nombre: initialData?.nombre ?? '',
            institutionId: String(initialInstitutionId),
            teacherId: firstAssignment
                ? String(firstAssignment.teacherId)
                : '',
            courseId: firstAssignment
                ? String(firstAssignment.courseId)
                : '',
        });

        setSchedules(
            firstAssignment
                ? schedulesForCourse(
                    initialData,
                    firstAssignment.courseId
                )
                : []
        );

        setScheduleError('');
    }, [initialData, open, user?.institutionId]);

    const selectedInstitutionId = Number(form.institutionId);

    const filteredCourses = useMemo(() => {
        if (!isSuperAdmin) {
            return courses;
        }

        if (!selectedInstitutionId) {
            return [];
        }

        return courses.filter(
            course =>
                Number(course.institutionId) ===
                selectedInstitutionId
        );
    }, [courses, isSuperAdmin, selectedInstitutionId]);

    const filteredTeachers = useMemo(() => {
        if (!isSuperAdmin) {
            return teachers;
        }

        if (!selectedInstitutionId) {
            return [];
        }

        return teachers.filter(
            teacher =>
                Number(teacher.institutionId) ===
                selectedInstitutionId
        );
    }, [teachers, isSuperAdmin, selectedInstitutionId]);

    const selectedAssignment = activeAssignments.find(
        assignment =>
            assignment.courseId === Number(form.courseId)
    );

    const selectedTeacherId = Number(form.teacherId);

    const teacherChanged =
        !selectedAssignment ||
        selectedAssignment.teacherId !== selectedTeacherId;

    const handleInstitutionChange = value => {
        setSchedules([]);
        setScheduleError('');

        setForm(current => ({
            ...current,
            institutionId: value,
            courseId: '',
            teacherId: '',
        }));
    };

    const handleCourseChange = value => {
        setSchedules(
            isEditing && value
                ? schedulesForCourse(initialData, value)
                : []
        );

        setScheduleError('');

        const assignment = activeAssignments.find(
            item => item.courseId === Number(value)
        );

        setForm(current => ({
            ...current,
            courseId: value,
            teacherId: assignment
                ? String(assignment.teacherId)
                : '',
        }));
    };

    const updateSchedule = (index, field, value) => {
        setSchedules(current =>
            current.map((schedule, i) =>
                i === index
                    ? { ...schedule, [field]: value }
                    : schedule
            )
        );

        setScheduleError('');
    };

    const handleSubmit = event => {
        event.preventDefault();

        const nombre = form.nombre.trim();

        if (
            !nombre ||
            !form.courseId ||
            !form.teacherId
        ) {
            return;
        }

        if (isSuperAdmin && !selectedInstitutionId) {
            return;
        }

        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

        for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];

            if (
                !timePattern.test(schedule.startTime) ||
                !timePattern.test(schedule.endTime) ||
                schedule.startTime >= schedule.endTime
            ) {
                setScheduleError(
                    `Revisá las horas del encuentro ${i + 1}.`
                );
                return;
            }

            if (
                schedules.some(
                    (other, j) =>
                        j !== i &&
                        other.day === schedule.day &&
                        schedule.startTime < other.endTime &&
                        other.startTime < schedule.endTime
                )
            ) {
                setScheduleError(
                    'Hay encuentros superpuestos en un mismo día.'
                );
                return;
            }
        }

        if (!isEditing) {
            const payload = {
                nombre,
                teacherId: Number(form.teacherId),
                courseId: Number(form.courseId),
                schedules,
            };

            if (isSuperAdmin) {
                payload.institutionId = selectedInstitutionId;
            }

            onSubmit(payload);
            return;
        }

        const payload = {
            id: initialData.id,
            nombre,
            courseId: Number(form.courseId),
            schedules,
        };

        if (teacherChanged) {
            payload.teacherId = selectedTeacherId;
            payload.courseId = Number(form.courseId);
        }

        onSubmit(payload);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <form
                onSubmit={handleSubmit}
                className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
            >
                <div>
                    <h3 className="text-xl font-semibold">
                        {isEditing
                            ? 'Editar materia'
                            : 'Nueva materia'}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                        {isEditing
                            ? 'Modificá los datos, el docente y los horarios del curso seleccionado.'
                            : 'Completá los datos y agregá los encuentros semanales que necesites.'}
                    </p>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="subject-name"
                        className="block text-sm font-medium text-slate-300"
                    >
                        Nombre de la materia
                    </label>

                    <input
                        id="subject-name"
                        value={form.nombre}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                nombre: event.target.value,
                            }))
                        }
                        placeholder="Ej: Matemática"
                        required
                        maxLength={120}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                </div>

                {isSuperAdmin && (
                    <div className="space-y-2">
                        <label
                            htmlFor="subject-institution"
                            className="block text-sm font-medium text-slate-300"
                        >
                            Institución
                        </label>

                        <select
                            id="subject-institution"
                            value={form.institutionId}
                            onChange={event =>
                                handleInstitutionChange(
                                    event.target.value
                                )
                            }
                            required
                            disabled={
                                isEditing ||
                                institutionsLoading
                            }
                            className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">
                                Seleccionar institución
                            </option>

                            {institutions.map(institution => (
                                <option
                                    key={institution.id}
                                    value={institution.id}
                                >
                                    {institution.name ??
                                        institution.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-2">
                    <label
                        htmlFor="subject-course"
                        className="block text-sm font-medium text-slate-300"
                    >
                        Curso
                    </label>

                    <select
                        id="subject-course"
                        value={form.courseId}
                        onChange={event =>
                            handleCourseChange(
                                event.target.value
                            )
                        }
                        required
                        disabled={
                            isSuperAdmin &&
                            !form.institutionId
                        }
                        className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">
                            Seleccionar curso
                        </option>

                        {filteredCourses.map(course => (
                            <option
                                key={course.id}
                                value={course.id}
                            >
                                {course.nombre}
                                {isEditing &&
                                    assignedCourseIds.has(course.id)
                                    ? ' — asignado'
                                    : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="subject-teacher"
                        className="block text-sm font-medium text-slate-300"
                    >
                        Docente responsable
                    </label>

                    <select
                        id="subject-teacher"
                        value={form.teacherId}
                        onChange={event =>
                            setForm(current => ({
                                ...current,
                                teacherId: event.target.value,
                            }))
                        }
                        required
                        disabled={!form.courseId}
                        className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">
                            Seleccionar docente
                        </option>

                        {filteredTeachers
                            .filter(
                                teacher =>
                                    teacher.isActive ||
                                    teacher.profile?.id ===
                                    selectedAssignment?.teacherId
                            )
                            .map(teacher => (
                                <option
                                    key={teacher.profile.id}
                                    value={teacher.profile.id}
                                >
                                    {teacher.firstName}{' '}
                                    {teacher.lastName}
                                </option>
                            ))}
                    </select>
                </div>

                {isEditing && selectedAssignment && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Responsable actual
                        </p>

                        <p className="mt-1 text-sm text-white">
                            {selectedAssignment.teacher?.user?.firstName}{' '}
                            {selectedAssignment.teacher?.user?.lastName}
                        </p>

                        {teacherChanged && form.teacherId && (
                            <p className="mt-2 text-xs text-amber-300">
                                Al guardar, el docente anterior
                                quedará registrado como histórico
                                y el nuevo pasará a ser el
                                responsable vigente.
                            </p>
                        )}
                    </div>
                )}

                {isEditing &&
                    form.courseId &&
                    !selectedAssignment && (
                        <p className="text-sm text-amber-300">
                            Esta materia no tiene un docente vigente
                            en el curso seleccionado. Podés asignar uno.
                        </p>
                    )}

                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h4 className="font-semibold text-white">
                                Días y horarios
                            </h4>

                            <p className="mt-1 text-xs text-slate-400">
                                Agregá uno o más encuentros, o dejá la materia sin horarios por ahora.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setSchedules(current => [
                                    ...current,
                                    newSchedule(),
                                ]);
                                setScheduleError('');
                            }}
                            disabled={!form.courseId || isSaving}
                            className="cursor-pointer rounded-lg border border-blue-500/50 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            + Agregar encuentro
                        </button>
                    </div>

                    {schedules.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-600 p-3 text-sm text-slate-400">
                            No hay encuentros configurados.
                        </p>
                    )}

                    {schedules.map((schedule, index) => (
                        <div
                            key={schedule.id ?? `new-${index}`}
                            className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-200">
                                    Encuentro {index + 1}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSchedules(current =>
                                            current.filter(
                                                (_, i) => i !== index
                                            )
                                        );
                                        setScheduleError('');
                                    }}
                                    disabled={isSaving}
                                    className="cursor-pointer text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                    Quitar
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="space-y-1 text-xs text-slate-300">
                                    <span>Día</span>

                                    <select
                                        value={schedule.day}
                                        onChange={event =>
                                            updateSchedule(
                                                index,
                                                'day',
                                                event.target.value
                                            )
                                        }
                                        className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                    >
                                        {DAYS.map(day => (
                                            <option
                                                key={day}
                                                value={day}
                                            >
                                                {DAY_NAMES[day]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-1 text-xs text-slate-300">
                                    <span>Turno</span>

                                    <select
                                        value={schedule.shift}
                                        onChange={event =>
                                            updateSchedule(
                                                index,
                                                'shift',
                                                event.target.value
                                            )
                                        }
                                        className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                    >
                                        {SHIFTS.map(shift => (
                                            <option
                                                key={shift}
                                                value={shift}
                                            >
                                                {SHIFT_NAMES[shift]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="space-y-1 text-xs text-slate-300">
                                    <span>Desde</span>

                                    <input
                                        type="time"
                                        required
                                        value={schedule.startTime}
                                        onChange={event =>
                                            updateSchedule(
                                                index,
                                                'startTime',
                                                event.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                    />
                                </label>

                                <label className="space-y-1 text-xs text-slate-300">
                                    <span>Hasta</span>

                                    <input
                                        type="time"
                                        required
                                        value={schedule.endTime}
                                        onChange={event =>
                                            updateSchedule(
                                                index,
                                                'endTime',
                                                event.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}

                    {scheduleError && (
                        <p
                            role="alert"
                            className="text-sm text-red-400"
                        >
                            {scheduleError}
                        </p>
                    )}
                </div>

                {formError && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-400"
                    >
                        {formError}
                    </p>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="cursor-pointer rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={
                            isSaving ||
                            (isSuperAdmin &&
                                !form.institutionId)
                        }
                        className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving
                            ? 'Guardando...'
                            : isEditing
                                ? 'Guardar cambios'
                                : 'Crear materia'}
                    </button>
                </div>
            </form>
        </div>
    );
}