
import { useContext, useState } from 'react';

import {
    AlertCircle,
    Ban,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    Pencil,
    Plus,
    Search,
    X,
    XCircle,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';

import {
    useEarlyNotices,
    useEarlyNoticeActions,
} from '../hooks/useEarlyNotices';

import EarlyNoticeFormModal from '../components/EarlyNoticeFormModal';

const STATUS = {
    CONFIRMED: {
        label: 'Confirmado',
        Icon: CheckCircle2,
        className:
            'border-emerald-300 bg-emerald-100 text-emerald-800',
    },
    PENDING: {
        label: 'Pendiente',
        Icon: Clock3,
        className:
            'border-amber-300 bg-amber-100 text-amber-900',
    },
    REJECTED: {
        label: 'Rechazado',
        Icon: XCircle,
        className:
            'border-red-300 bg-red-100 text-red-800',
    },
};

const TYPES = {
    ABSENCE: 'Ausencia',
    LATE_ARRIVAL: 'Llegada tarde',
};

const DAYS = {
    LUNES: 'Lunes',
    MARTES: 'Martes',
    MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves',
    VIERNES: 'Viernes',
    SABADO: 'Sábado',
    DOMINGO: 'Domingo',
};

const SHIFTS = {
    MANANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
});

const capitalize = value =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const formatClassDate = value => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return capitalize(DATE_FORMATTER.format(date));
};

const formatDateTime = value => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return capitalize(DATETIME_FORMATTER.format(date));
};

const fullName = user =>
    [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ') || 'No disponible';

const getRoles = user =>
    Array.isArray(user?.roles)
        ? user.roles.map(role =>
            typeof role === 'string'
                ? role.toUpperCase()
                : String(
                    role?.name || role?.role || ''
                ).toUpperCase()
        )
        : [];

const getTeacher = notice =>
    notice?.teacherUser ||
    notice?.teacherSubject?.teacher?.user ||
    null;

const getCreator = notice =>
    notice?.createdBy || null;

const getUpdater = notice =>
    notice?.updatedBy || null;

const getNoticeList = response => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }
    if (Array.isArray(response?.notices)) {
        return response.notices;
    }

    return [];
};

const getPagination = response =>
    response?.pagination ||
    response?.data?.pagination ||
    null;

function StatusBadge({ status, compact = false }) {
    const config = STATUS[status] || STATUS.PENDING;
    const Icon = config.Icon;

    return (
        <span
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-bold shadow-sm ${compact ? 'text-xs' : 'text-sm'
                } ${config.className}`}
        >
            <Icon
                size={compact ? 14 : 17}
                strokeWidth={2.5}
                className="shrink-0"
            />
            {config.label}
        </span>
    );
}

function ClassSchedule({ notice, compact = false }) {
    const late = notice.type === 'LATE_ARRIVAL';
    const arrival = notice.estimatedArrivalTime;

    return (
        <div className={compact ? 'text-sm' : 'text-sm'}>
            {late ? (
                <>
                    <p className="font-semibold text-slate-900">
                        Inicio: {notice.startTime || '—'}
                    </p>

                    <p className="mt-1 font-bold text-amber-700">
                        Llegada: {arrival || 'No informada'}
                    </p>
                </>
            ) : (
                <>
                    <p className="font-semibold text-slate-900">
                        {notice.startTime || '—'}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                        Ausencia
                    </p>
                </>
            )}
        </div>
    );
}

function DetailItem({ label, children }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                {children || '—'}
            </div>
        </div>
    );
}

function NoticeDetails({ notice, onClose }) {
    if (!notice) return null;

    const teacher = getTeacher(notice);
    const creator = getCreator(notice);
    const updater = getUpdater(notice);

    const isLateArrival = notice.type === 'LATE_ARRIVAL';

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 sm:p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-details-title"
                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
            >
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                        <h2
                            id="notice-details-title"
                            className="text-xl font-extrabold text-slate-900 sm:text-2xl"
                        >
                            Detalle del aviso
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Información completa del registro
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-3">
                    <StatusBadge status={notice.status} />

                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
                        {TYPES[notice.type] || notice.type}
                    </span>

                    {notice.isActive === false && (
                        <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                            Desactivado
                        </span>
                    )}
                </div>

                <div className="space-y-5">
                    <section className="rounded-xl border border-slate-200 p-4">
                        <h3 className="mb-4 text-base font-bold text-slate-900">
                            Información académica
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailItem label="Docente">
                                {fullName(teacher)}
                            </DetailItem>

                            <DetailItem label="Materia">
                                {notice.subject?.nombre || '—'}
                            </DetailItem>

                            <DetailItem label="Curso">
                                {notice.course?.nombre || '—'}
                            </DetailItem>

                            <DetailItem label="Institución">
                                {notice.institution?.nombre || '—'}
                            </DetailItem>

                            <DetailItem label="Turno">
                                {SHIFTS[notice.shift] ||
                                    notice.shift ||
                                    '—'}
                            </DetailItem>

                            <DetailItem label="Día de la cursada">
                                {DAYS[notice.day] ||
                                    notice.day ||
                                    '—'}
                            </DetailItem>
                        </div>
                    </section>

                    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-blue-950">
                            <CalendarDays size={19} />
                            Fecha y horario del aviso
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailItem label="Fecha de la clase">
                                {formatClassDate(notice.classDate)}
                            </DetailItem>

                            <DetailItem label="Horario de clase">
                                {notice.startTime || '—'} a{' '}
                                {notice.endTime || '—'}
                            </DetailItem>

                            {isLateArrival && (
                                <DetailItem label="Hora estimada de llegada">
                                    <span className="text-amber-700">
                                        {notice.estimatedArrivalTime ||
                                            'No informada'}
                                    </span>
                                </DetailItem>
                            )}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <h3 className="mb-4 text-base font-bold text-slate-900">
                            Registro y seguimiento
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailItem label="Creado por">
                                {fullName(creator)}
                            </DetailItem>

                            <DetailItem label="Fecha y hora de creación">
                                {formatDateTime(notice.createdAt)}
                            </DetailItem>

                            <DetailItem label="Última modificación por">
                                {updater
                                    ? fullName(updater)
                                    : 'No disponible'}
                            </DetailItem>

                            <DetailItem label="Fecha y hora de última modificación">
                                {formatDateTime(notice.updatedAt)}
                            </DetailItem>

                            {notice.confirmedAt && (
                                <>
                                    <DetailItem label="Confirmado por">
                                        {notice.confirmedBy
                                            ? fullName(notice.confirmedBy)
                                            : 'Docente responsable'}
                                    </DetailItem>

                                    <DetailItem label="Fecha de confirmación">
                                        {formatDateTime(notice.confirmedAt)}
                                    </DetailItem>
                                </>
                            )}

                            {notice.rejectedAt && (
                                <DetailItem label="Fecha de rechazo">
                                    {formatDateTime(notice.rejectedAt)}
                                </DetailItem>
                            )}
                        </div>
                    </section>

                    <section className="rounded-xl bg-slate-100 p-4">
                        <h3 className="font-bold text-slate-900">
                            Motivo del aviso
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                            {notice.reason || 'No especificado'}
                        </p>
                    </section>

                    {notice.status === 'REJECTED' && (
                        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <h3 className="font-bold text-red-800">
                                Motivo del rechazo
                            </h3>

                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-red-700">
                                {notice.rejectionReason ||
                                    'No especificado'}
                            </p>
                        </section>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full cursor-pointer rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-700"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}

function NoticeActions({
    notice,
    canEdit,
    canReview,
    canDeactivate,
    isBusy,
    onDetails,
    onEdit,
    onConfirm,
    onReject,
    onDeactivate,
    mobile = false,
}) {
    const edit = canEdit(notice);
    const review = canReview(notice);
    const deactivate = canDeactivate(notice);

    return (
        <div
            className={
                mobile
                    ? 'flex flex-wrap gap-2'
                    : 'flex flex-wrap items-center gap-1.5'
            }
        >
            <button
                type="button"
                onClick={() => onDetails(notice)}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
            >
                <Eye size={15} />
                Ver detalles
            </button>

            {edit && (
                <button
                    type="button"
                    onClick={() => onEdit(notice)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
                >
                    <Pencil size={14} />
                    Editar
                </button>
            )}

            {review && (
                <>
                    <button
                        type="button"
                        onClick={() => onConfirm(notice)}
                        disabled={isBusy}
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCircle2 size={15} />
                        Confirmar
                    </button>

                    <button
                        type="button"
                        onClick={() => onReject(notice)}
                        disabled={isBusy}
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <XCircle size={15} />
                        Rechazar
                    </button>
                </>
            )}

            {deactivate && (
                <button
                    type="button"
                    onClick={() => onDeactivate(notice)}
                    disabled={isBusy}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Ban size={14} />
                    Desactivar
                </button>
            )}
        </div>
    );
}

export default function EarlyNoticesView({
    token: tokenProp,
    currentUser: userProp,
}) {
    const auth = useContext(AuthContext);

    const token = tokenProp ?? auth?.token;
    const currentUser = userProp ?? auth?.user;

    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [selectedNotice, setSelectedNotice] = useState(null);
    const [editingNotice, setEditingNotice] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [formError, setFormError] = useState('');

    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    const roles = getRoles(currentUser);

    const isSuperAdmin =
        currentUser?.isSuperAdmin === true ||
        roles.includes('SUPER_ADMIN');

    const isAuthority =
        isSuperAdmin ||
        roles.includes('DIRECTOR') ||
        roles.includes('PRECEPTOR');

    const isTeacher =
        roles.includes('TEACHER') ||
        Boolean(currentUser?.teacherProfile);

    const isStudentOnly =
        !isAuthority &&
        !isTeacher &&
        roles.includes('STUDENT');

    const canCreate = isAuthority || isTeacher;

    const {
        data,
        isLoading,
        error,
    } = useEarlyNotices(token, {
        status: isStudentOnly ? 'CONFIRMED' : status,
        page,
        limit: 20,
    });

    const actions = useEarlyNoticeActions(token);

    const notices = getNoticeList(data);
    const pagination = getPagination(data);

    const filtered = notices.filter(notice => {
        const searchable = [
            notice.subject?.nombre,
            notice.course?.nombre,
            notice.reason,
            notice.type,
            TYPES[notice.type],
            notice.estimatedArrivalTime,
            fullName(getTeacher(notice)),
            fullName(getCreator(notice)),
        ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('es');

        return searchable.includes(
            search.trim().toLocaleLowerCase('es')
        );
    });

    const ownsNotice = notice =>
        isTeacher &&
        Number(currentUser?.id) ===
        Number(notice.teacherUserId);

    const canReview = notice =>
        notice.isActive !== false &&
        notice.status === 'PENDING' &&
        ownsNotice(notice);

    const canEdit = notice =>
        notice.isActive !== false &&
        (
            ownsNotice(notice) ||
            (
                isAuthority &&
                notice.status === 'PENDING'
            )
        );

    const canDeactivate = notice =>
        isAuthority &&
        notice.isActive !== false;

    const isSaving =
        actions.create.isPending ||
        actions.update.isPending;

    const isBusy =
        actions.confirm.isPending ||
        actions.reject.isPending ||
        actions.deactivate.isPending;

    const clearMessages = () => {
        setActionError('');
        setActionSuccess('');
        setFormError('');
    };

    const openCreate = () => {
        clearMessages();
        setEditingNotice(null);
        setFormOpen(true);
    };

    const openEdit = notice => {
        clearMessages();
        setEditingNotice(notice);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (isSaving) return;

        setFormOpen(false);
        setEditingNotice(null);
        setFormError('');
    };

    const handleSubmit = async payload => {
        try {
            setFormError('');
            setActionError('');
            setActionSuccess('');

            if (editingNotice) {
                await actions.update.mutateAsync({
                    id: editingNotice.id,
                    data: payload,
                });

                setActionSuccess(
                    'El aviso se actualizó correctamente.'
                );
            } else {
                await actions.create.mutateAsync(payload);

                setActionSuccess(
                    'El aviso se creó correctamente.'
                );

                setPage(1);
            }

            setFormOpen(false);
            setEditingNotice(null);
        } catch (err) {
            setFormError(
                err?.message ||
                'No se pudo guardar el aviso.'
            );
        }
    };

    const handleConfirm = async notice => {
        if (
            !window.confirm(
                '¿Confirmar este aviso? Al confirmarlo quedará disponible para los alumnos correspondientes.'
            )
        ) {
            return;
        }

        try {
            clearMessages();

            await actions.confirm.mutateAsync(notice.id);

            setActionSuccess(
                'El aviso fue confirmado correctamente.'
            );
        } catch (err) {
            setActionError(
                err?.message ||
                'No se pudo confirmar el aviso.'
            );
        }
    };

    const handleReject = async notice => {
        const reason = window.prompt(
            'Indicá el motivo del rechazo:'
        );

        if (reason === null) return;

        if (!reason.trim()) {
            setActionError(
                'Debés indicar un motivo de rechazo.'
            );
            return;
        }

        try {
            clearMessages();

            await actions.reject.mutateAsync({
                id: notice.id,
                rejectionReason: reason.trim(),
            });

            setActionSuccess(
                'El aviso fue rechazado correctamente.'
            );
        } catch (err) {
            setActionError(
                err?.message ||
                'No se pudo rechazar el aviso.'
            );
        }
    };

    const handleDeactivate = async notice => {
        if (
            !window.confirm(
                '¿Desactivar este aviso? El registro se conservará.'
            )
        ) {
            return;
        }

        try {
            clearMessages();

            await actions.deactivate.mutateAsync(notice.id);

            setActionSuccess(
                'El aviso fue desactivado correctamente.'
            );
        } catch (err) {
            setActionError(
                err?.message ||
                'No se pudo desactivar el aviso.'
            );
        }
    };

    const actionProps = {
        canEdit,
        canReview,
        canDeactivate,
        isBusy,
        onDetails: setSelectedNotice,
        onEdit: openEdit,
        onConfirm: handleConfirm,
        onReject: handleReject,
        onDeactivate: handleDeactivate,
    };

    return (
        <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">
                        Avisos Tempranos
                    </h1>

                    <p className="mt-2 text-sm text-slate-200">
                        Consultá las ausencias y llegadas tarde
                        de docentes.
                    </p>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-xl bg-blue-600 px-7 py-3 text-base font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
                    >
                        <Plus size={23} strokeWidth={2.5} />
                        Nuevo aviso
                    </button>
                )}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                <AlertCircle
                    size={22}
                    className="mt-0.5 shrink-0"
                />

                <p className="text-sm font-medium">
                    Los avisos confirmados son los válidos para
                    informar a los alumnos. Los avisos pendientes
                    requieren confirmación del docente responsable.
                </p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/90 p-4 md:flex-row">
                <div className="relative min-w-0 flex-1">
                    <Search
                        size={19}
                        className="absolute left-3 top-3 text-slate-400"
                    />

                    <input
                        type="search"
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                        placeholder="Buscar por docente, materia, curso, motivo o creador..."
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-blue-500"
                    />
                </div>

                {!isStudentOnly && (
                    <select
                        value={status}
                        onChange={event => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}
                        className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-blue-500"
                    >
                        <option value="">
                            Todos los estados
                        </option>

                        <option value="CONFIRMED">
                            Confirmados
                        </option>

                        <option value="PENDING">
                            Pendientes
                        </option>

                        <option value="REJECTED">
                            Rechazados
                        </option>
                    </select>
                )}
            </div>

            {actionSuccess && (
                <div
                    role="status"
                    className="rounded-xl border border-green-300 bg-green-100 p-4 text-green-900"
                >
                    {actionSuccess}
                </div>
            )}

            {(error || actionError) && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-100 p-4 text-red-800"
                >
                    {actionError || error?.message}
                </div>
            )}

            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        Listado de avisos
                    </h2>

                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                        {filtered.length} en esta página
                    </span>
                </div>

                {/* Vista móvil: tarjetas */}
                <div className="space-y-3 p-3 md:hidden">
                    {isLoading && (
                        <p className="py-10 text-center text-sm text-slate-500">
                            Cargando avisos...
                        </p>
                    )}

                    {!isLoading && filtered.length === 0 && (
                        <p className="py-10 text-center text-sm text-slate-500">
                            No se encontraron avisos.
                        </p>
                    )}

                    {!isLoading && filtered.map(notice => (
                        <article
                            key={notice.id}
                            className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h3 className="break-words text-base font-extrabold text-slate-900">
                                        {fullName(getTeacher(notice))}
                                    </h3>

                                    <p className="mt-1 break-words text-sm text-slate-600">
                                        {notice.subject?.nombre || '—'}
                                        {' · '}
                                        {notice.course?.nombre || '—'}
                                    </p>
                                </div>

                                <StatusBadge
                                    status={notice.status}
                                    compact
                                />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                                    {TYPES[notice.type] || notice.type}
                                </span>

                                {notice.isActive === false && (
                                    <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
                                        Desactivado
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
                                <div className="flex items-start gap-2">
                                    <CalendarDays
                                        size={18}
                                        className="mt-0.5 shrink-0 text-slate-500"
                                    />

                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Fecha de clase
                                        </p>

                                        <p className="text-sm font-bold text-slate-900">
                                            {formatClassDate(notice.classDate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Clock3
                                        size={18}
                                        className="mt-0.5 shrink-0 text-slate-500"
                                    />

                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Horario
                                        </p>

                                        <ClassSchedule
                                            notice={notice}
                                            compact
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-slate-200 pt-3">
                                <NoticeActions
                                    notice={notice}
                                    {...actionProps}
                                    mobile
                                />
                            </div>
                        </article>
                    ))}
                </div>

                {/* Vista de escritorio: tabla compacta */}
                <div className="hidden min-w-0 md:block">
                    <table className="w-full table-fixed border-collapse text-left text-sm">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[23%]" />
                            <col className="w-[18%]" />
                            <col className="w-[15%]" />
                            <col className="w-[29%]" />
                        </colgroup>

                        <thead className="bg-slate-800 text-slate-100">
                            <tr>
                                {[
                                    'Estado',
                                    'Docente / Materia',
                                    'Fecha de clase',
                                    'Horario',
                                    'Acciones',
                                ].map(column => (
                                    <th
                                        key={column}
                                        scope="col"
                                        className="px-3 py-4 text-xs font-bold uppercase tracking-wide"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-12 text-center text-slate-500"
                                    >
                                        Cargando avisos...
                                    </td>
                                </tr>
                            )}

                            {!isLoading && filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-14 text-center text-slate-500"
                                    >
                                        No se encontraron avisos.
                                    </td>
                                </tr>
                            )}

                            {!isLoading && filtered.map(notice => (
                                <tr
                                    key={notice.id}
                                    className="align-middle transition-colors hover:bg-blue-50/60"
                                >
                                    <td className="px-3 py-4">
                                        <StatusBadge
                                            status={notice.status}
                                            compact
                                        />

                                        {notice.isActive === false && (
                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                Desactivado
                                            </p>
                                        )}
                                    </td>

                                    <td className="min-w-0 px-3 py-4">
                                        <p className="break-words font-bold text-slate-900">
                                            {fullName(getTeacher(notice))}
                                        </p>

                                        <p className="mt-1 break-words text-xs text-slate-600">
                                            {notice.subject?.nombre || '—'}
                                        </p>

                                        <p className="mt-1 break-words text-xs text-slate-500">
                                            {notice.course?.nombre || '—'}
                                        </p>
                                    </td>

                                    <td className="min-w-0 px-3 py-4">
                                        <p className="break-words font-semibold text-slate-900">
                                            {formatClassDate(notice.classDate)}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {TYPES[notice.type] || notice.type}
                                        </p>
                                    </td>

                                    <td className="px-3 py-4">
                                        <ClassSchedule notice={notice} />
                                    </td>

                                    <td className="px-2 py-3">
                                        <NoticeActions
                                            notice={notice}
                                            {...actionProps}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {pagination?.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() =>
                            setPage(current =>
                                Math.max(1, current - 1)
                            )
                        }
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ChevronLeft size={18} />
                        Anterior
                    </button>

                    <span className="text-sm font-medium text-white">
                        Página {page} de {pagination.totalPages}
                    </span>

                    <button
                        type="button"
                        disabled={page >= pagination.totalPages}
                        onClick={() =>
                            setPage(current => current + 1)
                        }
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Siguiente
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            <NoticeDetails
                notice={selectedNotice}
                onClose={() => setSelectedNotice(null)}
            />

            <EarlyNoticeFormModal
                open={formOpen}
                token={token}
                initialData={editingNotice}
                onSubmit={handleSubmit}
                onClose={closeForm}
                isSaving={isSaving}
                formError={formError}
            />
        </div>
    );
}
