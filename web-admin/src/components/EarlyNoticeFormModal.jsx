import { createPortal } from 'react-dom';

import {
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { AuthContext } from '../context/AuthContext';
import { useEarlyNoticeCreationOptions } from '../hooks/useEarlyNotices';

const EMPTY_FORM = {
    institutionId: '',
    teacherUserId: '',
    subjectId: '',
    courseId: '',
    teacherSubjectId: '',
    scheduleId: '',
    classDate: '',
    type: 'ABSENCE',
    estimatedArrivalTime: '',
    reason: '',
};

const DAYS = [
    'DOMINGO',
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
];

const DAY_LABELS = {
    LUNES: 'Lunes',
    MARTES: 'Martes',
    MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves',
    VIERNES: 'Viernes',
    SABADO: 'Sábado',
};

const SHIFT_LABELS = {
    MANANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
};

const FIELD_CLASS =
    'w-full min-w-0 rounded-xl border border-slate-600 ' +
    'bg-slate-800 px-4 py-3 text-sm text-white ' +
    'outline-none transition focus:border-blue-500 ' +
    'focus:ring-2 focus:ring-blue-500/20 ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
    'block text-sm font-semibold text-slate-200';

const toArray = value =>
    Array.isArray(value) ? value : [];

const uniqueById = items =>
    Array.from(
        new Map(
            items
                .filter(item => item?.id != null)
                .map(item => [Number(item.id), item])
        ).values()
    );

const fullName = user =>
    [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ') || 'Sin nombre';

const dateToInput = value => {
    if (!value) return '';

    if (typeof value === 'string') {
        return value.slice(0, 10);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ''
        : date.toISOString().slice(0, 10);
};

const getDay = dateString => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null;
    }

    const date = new Date(`${dateString}T00:00:00Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== dateString
    ) {
        return null;
    }

    return DAYS[date.getUTCDay()];
};

const getRoles = user =>
    toArray(user?.roles).map(role =>
        typeof role === 'string'
            ? role.toUpperCase()
            : String(
                role?.name || role?.role || ''
            ).toUpperCase()
    );

const getTeacherUser = assignment =>
    assignment?.teacher?.user ||
    assignment?.teacherUser ||
    null;

const getTeacherUserId = assignment =>
    Number(
        assignment?.teacherUserId ??
        assignment?.teacher?.userId ??
        getTeacherUser(assignment)?.id ??
        0
    );

const getInstitutionId = assignment =>
    Number(
        assignment?.institutionId ??
        assignment?.subject?.institutionId ??
        assignment?.course?.institutionId ??
        0
    );

const scheduleLabel = schedule =>
    [
        DAY_LABELS[schedule.day] || schedule.day,
        SHIFT_LABELS[schedule.shift] || schedule.shift,
        `${schedule.startTime} - ${schedule.endTime}`,
    ].join(' · ');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeToMinutes = value => {
    if (!TIME_REGEX.test(value || '')) {
        return null;
    }

    const [hours, minutes] = value.split(':').map(Number);

    return hours * 60 + minutes;
};

const validateArrivalTime = (value, startTime, endTime) => {
    const arrival = timeToMinutes(value);

    if (arrival === null) {
        return 'Ingresá una hora estimada de llegada válida.';
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (start === null || end === null) {
        return 'El horario de la clase no es válido.';
    }

    if (end <= start) {
        return 'El horario de finalización debe ser posterior al inicio.';
    }

    if (arrival <= start) {
        return 'La llegada estimada debe ser posterior al inicio de la clase.';
    }

    if (arrival >= end) {
        return 'La llegada estimada debe ser anterior al final de la clase.';
    }

    return '';
};

function Field({ label, htmlFor, hint, children }) {
    return (
        <div className="min-w-0 space-y-2">
            <label htmlFor={htmlFor} className={LABEL_CLASS}>
                {label}
            </label>

            {children}

            {hint && (
                <p className="text-xs leading-relaxed text-slate-400">
                    {hint}
                </p>
            )}
        </div>
    );
}

export default function EarlyNoticeFormModal({
    open,
    token,
    initialData = null,
    onSubmit,
    onClose,
    isSaving = false,
    formError = '',
}) {
    const { user } = useContext(AuthContext);

    const isEditing = Boolean(initialData?.id);
    const roles = getRoles(user);

    const superAdmin =
        user?.isSuperAdmin === true ||
        roles.includes('SUPER_ADMIN');

    const authority =
        superAdmin ||
        roles.includes('DIRECTOR') ||
        roles.includes('PRECEPTOR');

    const teacherRole =
        roles.includes('TEACHER') ||
        Boolean(user?.teacherProfile);

    const lockTeacher = teacherRole && !authority;

    const [form, setForm] = useState(EMPTY_FORM);
    const [localError, setLocalError] = useState('');

    const {
        data: optionsResponse,
        isLoading,
        isError,
        error,
        refetch,
    } = useEarlyNoticeCreationOptions(
        token,
        open && !isEditing
    );

    const options = useMemo(() => {
        if (!optionsResponse) return {};

        return optionsResponse?.data ??
            optionsResponse?.options ??
            optionsResponse;
    }, [optionsResponse]);

    const assignments = useMemo(
        () => toArray(options.assignments).filter(
            assignment => assignment.isActive !== false
        ),
        [options]
    );

    const institutions = useMemo(
        () => toArray(options.institutions),
        [options]
    );

    const allSchedules = useMemo(
        () => toArray(options.schedules),
        [options]
    );

    useEffect(() => {
        if (!open) return;

        setLocalError('');

        if (!initialData) {
            setForm({
                ...EMPTY_FORM,
                institutionId: user?.institutionId
                    ? String(user.institutionId)
                    : '',
                teacherUserId: lockTeacher && user?.id
                    ? String(user.id)
                    : '',
            });

            return;
        }

        setForm({
            institutionId: String(
                initialData.institutionId ?? ''
            ),
            teacherUserId: String(
                initialData.teacherUserId ?? ''
            ),
            subjectId: String(
                initialData.subjectId ?? ''
            ),
            courseId: String(
                initialData.courseId ?? ''
            ),
            teacherSubjectId: String(
                initialData.teacherSubjectId ?? ''
            ),
            scheduleId: String(
                initialData.scheduleId ?? ''
            ),
            classDate: dateToInput(
                initialData.classDate
            ),
            type: initialData.type || 'ABSENCE',
            estimatedArrivalTime:
                initialData.estimatedArrivalTime || '',
            reason: initialData.reason || '',
        });
    }, [
        open,
        initialData,
        user?.id,
        user?.institutionId,
        lockTeacher,
    ]);

    const availableInstitutions = useMemo(() => {
        const ids = new Set(
            assignments
                .map(getInstitutionId)
                .filter(Boolean)
        );

        return institutions.filter(institution =>
            ids.has(Number(institution.id))
        );
    }, [assignments, institutions]);

    const institutionId = Number(form.institutionId);
    const teacherUserId = Number(form.teacherUserId);
    const subjectId = Number(form.subjectId);
    const courseId = Number(form.courseId);
    const teacherSubjectId = Number(form.teacherSubjectId);

    const institutionAssignments = useMemo(() => {
        if (!institutionId) {
            return assignments;
        }

        return assignments.filter(
            assignment =>
                getInstitutionId(assignment) === institutionId
        );
    }, [assignments, institutionId]);

    const teachers = useMemo(() => {
        const teacherMap = new Map();

        institutionAssignments.forEach(assignment => {
            const id = getTeacherUserId(assignment);
            const teacher = getTeacherUser(assignment);

            if (!id) return;

            teacherMap.set(id, {
                id,
                firstName: teacher?.firstName || '',
                lastName: teacher?.lastName || '',
            });
        });

        if (
            lockTeacher &&
            user?.id &&
            !teacherMap.has(Number(user.id))
        ) {
            teacherMap.set(Number(user.id), {
                id: Number(user.id),
                firstName: user.firstName,
                lastName: user.lastName,
            });
        }

        return Array.from(teacherMap.values()).sort(
            (a, b) =>
                fullName(a).localeCompare(
                    fullName(b),
                    'es'
                )
        );
    }, [
        institutionAssignments,
        lockTeacher,
        user,
    ]);

    const teacherAssignments = useMemo(() => {
        if (!teacherUserId) return [];

        return institutionAssignments.filter(
            assignment =>
                getTeacherUserId(assignment) === teacherUserId
        );
    }, [
        institutionAssignments,
        teacherUserId,
    ]);

    const subjects = useMemo(() => {
        return uniqueById(
            teacherAssignments
                .map(assignment => assignment.subject)
                .filter(Boolean)
        ).sort((a, b) =>
            (a.nombre || '').localeCompare(
                b.nombre || '',
                'es'
            )
        );
    }, [teacherAssignments]);

    const subjectAssignments = useMemo(() => {
        return teacherAssignments.filter(
            assignment =>
                Number(assignment.subjectId) === subjectId
        );
    }, [
        teacherAssignments,
        subjectId,
    ]);

    const courses = useMemo(() => {
        return uniqueById(
            subjectAssignments
                .map(assignment => assignment.course)
                .filter(Boolean)
        ).sort((a, b) =>
            (a.nombre || '').localeCompare(
                b.nombre || '',
                'es'
            )
        );
    }, [subjectAssignments]);

    const selectedAssignment = useMemo(() => {
        return subjectAssignments.find(
            assignment =>
                Number(assignment.courseId) === courseId &&
                Number(assignment.id) === teacherSubjectId
        );
    }, [
        subjectAssignments,
        courseId,
        teacherSubjectId,
    ]);

    const classDay = getDay(form.classDate);

    const matchingSchedules = useMemo(() => {
        if (!selectedAssignment || !classDay) {
            return [];
        }

        const nestedSchedules =
            toArray(selectedAssignment.schedules);

        const source = nestedSchedules.length > 0
            ? nestedSchedules
            : allSchedules;

        return source.filter(schedule =>
            Number(schedule.subjectId) ===
            Number(selectedAssignment.subjectId) &&
            Number(schedule.courseId) ===
            Number(selectedAssignment.courseId) &&
            schedule.day === classDay
        );
    }, [
        selectedAssignment,
        classDay,
        allSchedules,
    ]);

    const selectedSchedule = matchingSchedules.find(
        schedule =>
            Number(schedule.id) === Number(form.scheduleId)
    );

    const canChooseInstitution =
        authority && availableInstitutions.length > 1;

    const isLateArrival = form.type === 'LATE_ARRIVAL';

    const currentStartTime = isEditing
        ? initialData?.startTime
        : selectedSchedule?.startTime;

    const currentEndTime = isEditing
        ? initialData?.endTime
        : selectedSchedule?.endTime;

    useEffect(() => {
        if (
            !open ||
            isEditing ||
            availableInstitutions.length !== 1
        ) {
            return;
        }

        setForm(current => {
            if (current.institutionId) return current;

            return {
                ...current,
                institutionId: String(
                    availableInstitutions[0].id
                ),
            };
        });
    }, [
        open,
        isEditing,
        availableInstitutions,
    ]);

    useEffect(() => {
        if (!open || isEditing || !lockTeacher || !user?.id) {
            return;
        }

        setForm(current => {
            const id = String(user.id);

            if (current.teacherUserId === id) {
                return current;
            }

            return {
                ...current,
                teacherUserId: id,
                subjectId: '',
                courseId: '',
                teacherSubjectId: '',
                scheduleId: '',
            };
        });
    }, [
        open,
        isEditing,
        lockTeacher,
        user?.id,
    ]);

    useEffect(() => {
        if (
            !open ||
            isEditing ||
            !form.courseId ||
            !form.subjectId
        ) {
            return;
        }

        const matches = subjectAssignments.filter(
            assignment =>
                Number(assignment.courseId) === courseId
        );

        if (matches.length !== 1) return;

        setForm(current => {
            const id = String(matches[0].id);

            if (current.teacherSubjectId === id) {
                return current;
            }

            return {
                ...current,
                teacherSubjectId: id,
                scheduleId: '',
            };
        });
    }, [
        open,
        isEditing,
        form.courseId,
        form.subjectId,
        courseId,
        subjectAssignments,
    ]);

    useEffect(() => {
        if (
            !open ||
            isEditing ||
            matchingSchedules.length !== 1
        ) {
            return;
        }

        setForm(current => {
            const id = String(matchingSchedules[0].id);

            if (current.scheduleId === id) {
                return current;
            }

            return {
                ...current,
                scheduleId: id,
            };
        });
    }, [
        open,
        isEditing,
        matchingSchedules,
    ]);

    const changeInstitution = value => {
        setLocalError('');

        setForm(current => ({
            ...current,
            institutionId: value,
            teacherUserId: lockTeacher
                ? String(user?.id || '')
                : '',
            subjectId: '',
            courseId: '',
            teacherSubjectId: '',
            scheduleId: '',
        }));
    };

    const changeTeacher = value => {
        if (lockTeacher) return;

        setLocalError('');

        setForm(current => ({
            ...current,
            teacherUserId: value,
            subjectId: '',
            courseId: '',
            teacherSubjectId: '',
            scheduleId: '',
        }));
    };

    const changeSubject = value => {
        setLocalError('');

        setForm(current => ({
            ...current,
            subjectId: value,
            courseId: '',
            teacherSubjectId: '',
            scheduleId: '',
        }));
    };

    const changeCourse = value => {
        setLocalError('');

        const assignment = subjectAssignments.find(
            item => Number(item.courseId) === Number(value)
        );

        setForm(current => ({
            ...current,
            courseId: value,
            teacherSubjectId: assignment
                ? String(assignment.id)
                : '',
            scheduleId: '',
        }));
    };

    const changeDate = value => {
        setLocalError('');

        setForm(current => ({
            ...current,
            classDate: value,
            scheduleId: '',
        }));
    };

    const changeType = value => {
        setLocalError('');

        setForm(current => ({
            ...current,
            type: value,
            estimatedArrivalTime:
                value === 'LATE_ARRIVAL'
                    ? current.estimatedArrivalTime
                    : '',
        }));
    };

    const handleSubmit = event => {
        event.preventDefault();
        setLocalError('');

        const reason = form.reason.trim();

        if (!reason) {
            setLocalError('Ingresá el motivo del aviso.');
            return;
        }

        if (reason.length > 2000) {
            setLocalError(
                'El motivo no puede superar los 2000 caracteres.'
            );
            return;
        }

        if (!classDay || classDay === 'DOMINGO') {
            setLocalError(
                'Seleccioná una fecha de clase válida.'
            );
            return;
        }

        if (!isEditing && !selectedAssignment) {
            setLocalError(
                'Seleccioná una materia y curso asignados al docente.'
            );
            return;
        }

        if (!isEditing && !selectedSchedule) {
            setLocalError(
                'Seleccioná un horario correspondiente a la fecha.'
            );
            return;
        }

        if (
            !isEditing &&
            lockTeacher &&
            getTeacherUserId(selectedAssignment) !==
            Number(user?.id)
        ) {
            setLocalError(
                'Solo podés crear avisos para tus propias materias.'
            );
            return;
        }

        const estimatedArrivalTime = isLateArrival
            ? form.estimatedArrivalTime
            : null;

        if (isLateArrival) {
            const arrivalError = validateArrivalTime(
                estimatedArrivalTime,
                currentStartTime,
                currentEndTime
            );

            if (arrivalError) {
                setLocalError(arrivalError);
                return;
            }
        }

        if (isEditing) {
            onSubmit({
                type: form.type,
                classDate: form.classDate,
                reason,
                estimatedArrivalTime,
            });

            return;
        }

        onSubmit({
            type: form.type,
            classDate: form.classDate,
            reason,
            estimatedArrivalTime,
            teacherSubjectId: Number(selectedAssignment.id),
            scheduleId: Number(selectedSchedule.id),
        });
    };

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 px-2 pb-3 pt-20 sm:px-4 sm:pb-5 sm:pt-24 lg:px-6 lg:pb-6 lg:pt-24"
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="early-notice-title"
                className="flex max-h-[calc(100dvh-6rem)] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl lg:max-h-[calc(100dvh-7rem)] lg:w-[96vw]"
            >
                {/* Encabezado fijo */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-700 bg-slate-900 px-5 py-5 sm:px-7 lg:px-10">
                    <div>
                        <h2
                            id="early-notice-title"
                            className="text-2xl font-extrabold tracking-tight lg:text-3xl"
                        >
                            {isEditing
                                ? 'Editar aviso temprano'
                                : 'Nuevo aviso temprano'}
                        </h2>

                        <p className="mt-2 text-sm text-slate-400">
                            {isEditing
                                ? 'Modificá los datos permitidos del aviso.'
                                : 'Informá una ausencia o llegada tarde de un docente.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="Cerrar"
                        className="shrink-0 cursor-pointer rounded-xl px-3 py-1 text-3xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                    >
                        ×
                    </button>
                </div>

                {/* Área desplazable del contenido */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
                    {!isEditing && isLoading && (
                        <p className="rounded-xl bg-slate-800 p-5 text-sm text-slate-300">
                            Cargando docentes, materias y horarios...
                        </p>
                    )}

                    {!isEditing && isError && (
                        <div className="space-y-3 rounded-xl border border-red-800 bg-red-950/40 p-5">
                            <p className="text-sm text-red-300">
                                {error?.message ||
                                    'No se pudieron cargar las opciones.'}
                            </p>

                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="cursor-pointer rounded-lg bg-red-700 px-4 py-2 text-sm font-medium hover:bg-red-600"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!isEditing &&
                        !isLoading &&
                        !isError &&
                        assignments.length === 0 && (
                            <p className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-5 text-sm text-amber-200">
                                No hay asignaciones docentes vigentes
                                disponibles para crear avisos.
                            </p>
                        )}

                    {(isEditing ||
                        (!isLoading &&
                            !isError &&
                            assignments.length > 0)) && (
                            <form
                                id="early-notice-form"
                                onSubmit={handleSubmit}
                                className="space-y-7"
                            >
                                {/* Datos académicos */}
                                {!isEditing && (
                                    <section className="space-y-5">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">
                                                Datos académicos
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-400">
                                                Seleccioná el docente y la clase
                                                sobre la que se registrará el aviso.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                                            {canChooseInstitution && (
                                                <Field
                                                    label="Institución"
                                                    htmlFor="notice-institution"
                                                >
                                                    <select
                                                        id="notice-institution"
                                                        value={form.institutionId}
                                                        onChange={event =>
                                                            changeInstitution(
                                                                event.target.value
                                                            )
                                                        }
                                                        required
                                                        className={`${FIELD_CLASS} cursor-pointer`}
                                                    >
                                                        <option value="">
                                                            Seleccionar institución
                                                        </option>

                                                        {availableInstitutions.map(
                                                            institution => (
                                                                <option
                                                                    key={institution.id}
                                                                    value={institution.id}
                                                                >
                                                                    {institution.nombre}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </Field>
                                            )}

                                            <Field
                                                label="1. Docente responsable"
                                                htmlFor="notice-teacher"
                                                hint={
                                                    lockTeacher
                                                        ? 'Solo podés informar tus propias ausencias o llegadas tarde.'
                                                        : 'Elegí al docente que faltará o llegará tarde.'
                                                }
                                            >
                                                <select
                                                    id="notice-teacher"
                                                    value={form.teacherUserId}
                                                    onChange={event =>
                                                        changeTeacher(
                                                            event.target.value
                                                        )
                                                    }
                                                    required
                                                    disabled={
                                                        lockTeacher ||
                                                        (
                                                            canChooseInstitution &&
                                                            !form.institutionId
                                                        )
                                                    }
                                                    className={`${FIELD_CLASS} ${lockTeacher
                                                        ? ''
                                                        : 'cursor-pointer'
                                                        }`}
                                                >
                                                    <option value="">
                                                        Seleccionar docente
                                                    </option>

                                                    {teachers.map(teacher => (
                                                        <option
                                                            key={teacher.id}
                                                            value={teacher.id}
                                                        >
                                                            {fullName(teacher)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>

                                            <Field
                                                label="2. Materia a su cargo"
                                                htmlFor="notice-subject"
                                            >
                                                <select
                                                    id="notice-subject"
                                                    value={form.subjectId}
                                                    onChange={event =>
                                                        changeSubject(
                                                            event.target.value
                                                        )
                                                    }
                                                    required
                                                    disabled={!form.teacherUserId}
                                                    className={`${FIELD_CLASS} cursor-pointer`}
                                                >
                                                    <option value="">
                                                        Seleccionar materia
                                                    </option>

                                                    {subjects.map(subject => (
                                                        <option
                                                            key={subject.id}
                                                            value={subject.id}
                                                        >
                                                            {subject.nombre}
                                                        </option>
                                                    ))}
                                                </select>

                                                {form.teacherUserId &&
                                                    subjects.length === 0 && (
                                                        <p className="mt-2 text-sm text-amber-300">
                                                            Este docente no tiene
                                                            materias vigentes
                                                            disponibles.
                                                        </p>
                                                    )}
                                            </Field>

                                            <Field
                                                label="3. Curso"
                                                htmlFor="notice-course"
                                            >
                                                <select
                                                    id="notice-course"
                                                    value={form.courseId}
                                                    onChange={event =>
                                                        changeCourse(
                                                            event.target.value
                                                        )
                                                    }
                                                    required
                                                    disabled={!form.subjectId}
                                                    className={`${FIELD_CLASS} cursor-pointer`}
                                                >
                                                    <option value="">
                                                        Seleccionar curso
                                                    </option>

                                                    {courses.map(course => (
                                                        <option
                                                            key={course.id}
                                                            value={course.id}
                                                        >
                                                            {course.nombre}
                                                            {course.career?.nombre
                                                                ? ` — ${course.career.nombre}`
                                                                : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                        </div>
                                    </section>
                                )}

                                {isEditing && (
                                    <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                                        <h3 className="text-lg font-bold text-white">
                                            Asignación académica
                                        </h3>

                                        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase text-slate-400">
                                                    Docente responsable
                                                </p>

                                                <p className="mt-2 font-semibold text-white">
                                                    {fullName(
                                                        initialData?.teacherUser ||
                                                        initialData?.teacherSubject
                                                            ?.teacher?.user
                                                    )}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase text-slate-400">
                                                    Materia
                                                </p>

                                                <p className="mt-2 font-semibold text-white">
                                                    {initialData?.subject?.nombre ||
                                                        'Materia no disponible'}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-semibold uppercase text-slate-400">
                                                    Curso
                                                </p>

                                                <p className="mt-2 font-semibold text-white">
                                                    {initialData?.course?.nombre ||
                                                        'Curso no disponible'}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="mt-4 text-xs text-slate-400">
                                            El docente y la asignación no pueden
                                            modificarse en un aviso existente.
                                        </p>
                                    </section>
                                )}

                                {/* Datos del aviso */}
                                <section className="space-y-5">
                                    <div className="border-t border-slate-700 pt-6">
                                        <h3 className="text-lg font-bold text-white">
                                            Información del aviso
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-400">
                                            Indicá el tipo de aviso, la fecha
                                            y el horario correspondiente.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                                        <Field
                                            label="Tipo de aviso"
                                            htmlFor="notice-type"
                                        >
                                            <select
                                                id="notice-type"
                                                value={form.type}
                                                onChange={event =>
                                                    changeType(event.target.value)
                                                }
                                                required
                                                className={`${FIELD_CLASS} cursor-pointer`}
                                            >
                                                <option value="ABSENCE">
                                                    Ausencia
                                                </option>

                                                <option value="LATE_ARRIVAL">
                                                    Llegada tarde
                                                </option>
                                            </select>
                                        </Field>

                                        <Field
                                            label="Fecha de la clase"
                                            htmlFor="notice-date"
                                            hint={
                                                classDay
                                                    ? `Día seleccionado: ${DAY_LABELS[classDay] ||
                                                    classDay
                                                    }`
                                                    : 'Seleccioná el día de la clase.'
                                            }
                                        >
                                            <input
                                                id="notice-date"
                                                type="date"
                                                value={form.classDate}
                                                onChange={event =>
                                                    changeDate(
                                                        event.target.value
                                                    )
                                                }
                                                required
                                                className={FIELD_CLASS}
                                            />
                                        </Field>

                                        {!isEditing && (
                                            <Field
                                                label="4. Horario de la clase"
                                                htmlFor="notice-schedule"
                                            >
                                                <select
                                                    id="notice-schedule"
                                                    value={form.scheduleId}
                                                    onChange={event => {
                                                        setLocalError('');

                                                        setForm(current => ({
                                                            ...current,
                                                            scheduleId:
                                                                event.target.value,
                                                        }));
                                                    }}
                                                    required
                                                    disabled={
                                                        !form.teacherSubjectId ||
                                                        !form.classDate ||
                                                        matchingSchedules.length === 0
                                                    }
                                                    className={`${FIELD_CLASS} cursor-pointer`}
                                                >
                                                    <option value="">
                                                        Seleccionar horario
                                                    </option>

                                                    {matchingSchedules.map(
                                                        schedule => (
                                                            <option
                                                                key={schedule.id}
                                                                value={schedule.id}
                                                            >
                                                                {scheduleLabel(schedule)}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </Field>
                                        )}

                                        {isEditing && (
                                            <div className="min-w-0 space-y-2">
                                                <p className={LABEL_CLASS}>
                                                    Horario registrado
                                                </p>

                                                <div className="min-h-[46px] rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-200">
                                                    {DAY_LABELS[initialData?.day] ||
                                                        initialData?.day ||
                                                        '—'}
                                                    {' · '}
                                                    {SHIFT_LABELS[initialData?.shift] ||
                                                        initialData?.shift ||
                                                        '—'}
                                                    {' · '}
                                                    {initialData?.startTime || '—'}
                                                    {' - '}
                                                    {initialData?.endTime || '—'}
                                                </div>
                                            </div>
                                        )}

                                        {isLateArrival && (
                                            <Field
                                                label="Hora estimada de llegada *"
                                                htmlFor="notice-arrival-time"
                                                hint={
                                                    currentStartTime && currentEndTime
                                                        ? `La clase comienza a las ${currentStartTime} y finaliza a las ${currentEndTime}.`
                                                        : 'Seleccioná primero el horario de la clase.'
                                                }
                                            >
                                                <input
                                                    id="notice-arrival-time"
                                                    type="time"
                                                    step="60"
                                                    value={form.estimatedArrivalTime}
                                                    onChange={event => {
                                                        setLocalError('');

                                                        setForm(current => ({
                                                            ...current,
                                                            estimatedArrivalTime:
                                                                event.target.value,
                                                        }));
                                                    }}
                                                    required
                                                    className={`${FIELD_CLASS} border-amber-600/70 focus:border-amber-400 focus:ring-amber-500/20`}
                                                />
                                            </Field>
                                        )}
                                    </div>

                                    {!isEditing &&
                                        form.classDate &&
                                        form.teacherSubjectId &&
                                        matchingSchedules.length === 0 && (
                                            <p className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
                                                No hay horarios registrados
                                                para esa materia, curso y fecha.
                                                Verificá los horarios académicos.
                                            </p>
                                        )}

                                    {!isEditing && selectedSchedule && (
                                        <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 px-5 py-4 text-sm text-blue-200">
                                            Clase seleccionada:{' '}
                                            <strong>
                                                {scheduleLabel(selectedSchedule)}
                                            </strong>
                                        </div>
                                    )}
                                </section>

                                {/* Motivo */}
                                <section className="space-y-3 border-t border-slate-700 pt-6">
                                    <div>
                                        <label
                                            htmlFor="notice-reason"
                                            className="block text-lg font-bold text-white"
                                        >
                                            Motivo del aviso
                                        </label>

                                        <p className="mt-1 text-sm text-slate-400">
                                            Describí el motivo de la ausencia
                                            o llegada tarde.
                                        </p>
                                    </div>

                                    <textarea
                                        id="notice-reason"
                                        rows={4}
                                        maxLength={2000}
                                        value={form.reason}
                                        onChange={event =>
                                            setForm(current => ({
                                                ...current,
                                                reason: event.target.value,
                                            }))
                                        }
                                        required
                                        placeholder="Escribí aquí el motivo del aviso..."
                                        className={`${FIELD_CLASS} min-h-[130px] resize-y`}
                                    />

                                    <p className="text-right text-xs text-slate-500">
                                        {form.reason.length}/2000 caracteres
                                    </p>
                                </section>

                                {!isEditing && (
                                    <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4 text-sm leading-relaxed text-blue-200">
                                        Si el aviso lo crea el propio docente,
                                        quedará confirmado automáticamente.

                                        Si lo registra una autoridad,
                                        quedará pendiente hasta que el docente
                                        responsable lo confirme.
                                    </div>
                                )}

                                {(localError || formError) && (
                                    <p
                                        role="alert"
                                        className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
                                    >
                                        {localError || formError}
                                    </p>
                                )}
                            </form>
                        )}
                </div>

                {/* Pie fijo: acciones visibles sin bajar hasta el final */}
                {(isEditing ||
                    (!isLoading &&
                        !isError &&
                        assignments.length > 0)) && (
                        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-700 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 lg:px-10">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="cursor-pointer rounded-xl border border-slate-600 px-7 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                form="early-notice-form"
                                disabled={isSaving}
                                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving
                                    ? 'Guardando...'
                                    : isEditing
                                        ? 'Guardar cambios'
                                        : 'Crear aviso'}
                            </button>
                        </div>
                    )}
            </div>
        </div>,
        document.body
    );
}
