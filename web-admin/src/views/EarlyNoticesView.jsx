import { createPortal } from 'react-dom';

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
    Loader2,
    BookOpen,
    UserRound,
    Building2,
    ClipboardList,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';

import {
    useEarlyNotices,
    useEarlyNoticeActions,
} from '../hooks/useEarlyNotices';

import EarlyNoticeFormModal from '../components/EarlyNoticeFormModal';
import EarlyNoticeNotifications from '../components/EarlyNoticeNotifications';

const STATUS = {
    CONFIRMED: {
        label: 'Confirmado',
        Icon: CheckCircle2,
        className:
            'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    },
    PENDING: {
        label: 'Pendiente',
        Icon: Clock3,
        className:
            'border-amber-500/20 bg-amber-500/10 text-amber-400',
    },
    REJECTED: {
        label: 'Rechazado',
        Icon: XCircle,
        className:
            'border-red-500/20 bg-red-500/10 text-red-400',
    },
};

const TYPES = {
    ABSENCE: 'Ausencia',
    LATE_ARRIVAL: 'Llegada tarde',
    ATTENDANCE_CONFIRMED: 'Asistencia confirmada',
    VIRTUAL_SYNCHRONOUS: 'Clase virtual sincrónica',
    VIRTUAL_ASYNCHRONOUS: 'Clase virtual asincrónica',
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

const capitalize = (value) =>
    value
        ? value.charAt(0).toUpperCase() + value.slice(1)
        : '';

const formatClassDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return capitalize(DATE_FORMATTER.format(date));
};

const formatDateTime = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return capitalize(DATETIME_FORMATTER.format(date));
};

const fullName = (user) =>
    [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ') || 'No disponible';

const getRoles = (user) =>
    Array.isArray(user?.roles)
        ? user.roles.map((role) =>
            typeof role === 'string'
                ? role.toUpperCase()
                : String(
                    role?.name || role?.role || ''
                ).toUpperCase()
        )
        : [];

const getTeacher = (notice) =>
    notice?.teacherUser ||
    notice?.teacherSubject?.teacher?.user ||
    null;

const getCreator = (notice) =>
    notice?.createdBy || null;

const getUpdater = (notice) =>
    notice?.updatedBy || null;

const getNoticeList = (response) => {
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

const getPagination = (response) =>
    response?.pagination ||
    response?.data?.pagination ||
    null;

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

function StatusBadge({ status, compact = false }) {
    const config = STATUS[status] || STATUS.PENDING;
    const Icon = config.Icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${compact
                ? 'px-2.5 py-1 text-xs'
                : 'px-3 py-1.5 text-sm'
                } ${config.className}`}
        >
            <Icon
                size={compact ? 14 : 16}
                className="shrink-0"
            />
            {config.label}
        </span>
    );
}

const getAffectedClasses = (notice) => Array.isArray(notice?.classes) ? notice.classes : [];
const noticePeriod = (notice) => {
    const classes = getAffectedClasses(notice);
    const start = notice.periodStart || classes[0]?.classDate || notice.classDate;
    const end = notice.periodEnd || classes[classes.length - 1]?.classDate || notice.classDate;
    return start && end && new Date(start).getTime() !== new Date(end).getTime()
        ? `${formatClassDate(start)} al ${formatClassDate(end)}`
        : formatClassDate(start);
};

function ClassSchedule({ notice }) {
    const isLate = notice.type === 'LATE_ARRIVAL';
    const classes = getAffectedClasses(notice);
    if (classes.length > 1) return (
        <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-300">{classes.length} clases afectadas</p>
            <p className="text-xs text-slate-400">Ver detalle de fechas y horarios</p>
        </div>
    );

    return (
        <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-200">
                Inicio: {notice.startTime || '—'}
            </p>

            {isLate ? (
                <p className="text-xs font-medium text-amber-400">
                    Llegada: {notice.estimatedArrivalTime || 'No informada'}
                </p>
            ) : (
                <p className="text-xs text-slate-500">
                    Ausencia
                </p>
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

            <div className="mt-1 break-words text-sm font-medium text-slate-200">
                {children || '—'}
            </div>
        </div>
    );
}

function DetailSection({ title, icon: Icon, children }) {
    return (
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5">
            <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
                <Icon size={18} className="text-blue-400" />
                {title}
            </h3>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {children}
            </div>
        </section>
    );
}

function NoticeDetails({ notice, onClose }) {
    if (!notice) return null;

    const teacher = getTeacher(notice);
    const creator = getCreator(notice);
    const updater = getUpdater(notice);

    const isLateArrival =
        notice.type === 'LATE_ARRIVAL';

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/80 px-3 pb-3 pt-20 backdrop-blur-sm sm:px-5 sm:pb-5 sm:pt-24">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-details-title"
                className="flex max-h-[calc(100dvh-6rem)] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
            >
                {/* ENCABEZADO */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                            <ClipboardList size={22} />
                        </div>

                        <div>
                            <h2
                                id="notice-details-title"
                                className="text-xl font-bold text-white"
                            >
                                Detalle del aviso
                            </h2>

                            <p className="mt-1 text-sm text-slate-400">
                                Información completa del registro
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENIDO */}
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 lg:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={notice.status} />

                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                            {TYPES[notice.type] || notice.type}
                        </span>

                        {notice.isActive === false && (
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                                Desactivado
                            </span>
                        )}
                    </div>

                    <DetailSection
                        title="Información académica"
                        icon={BookOpen}
                    >
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

                        <DetailItem label="Día de cursada">
                            {DAYS[notice.day] ||
                                notice.day ||
                                '—'}
                        </DetailItem>
                    </DetailSection>

                    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><CalendarDays size={18} className="text-blue-400" />Período y clases afectadas</h3>
                        <p className="text-sm text-slate-200">{noticePeriod(notice)}</p>
                        <p className="mt-1 text-sm font-semibold text-blue-300">{getAffectedClasses(notice).length || 1} clase(s) afectada(s)</p>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-700 text-xs uppercase text-slate-400"><tr><th className="py-2 pr-4">Fecha</th><th className="py-2 pr-4">Horario</th><th className="py-2 pr-4">Materia</th><th className="py-2">Curso</th></tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {(getAffectedClasses(notice).length ? getAffectedClasses(notice) : [{ classDate: notice.classDate, startTime: notice.startTime, endTime: notice.endTime }]).map((cls, i) => (
                                        <tr key={cls.id ?? i} className="text-slate-200">
                                            <td className="py-2 pr-4 whitespace-nowrap">{formatClassDate(cls.classDate)}</td>
                                            <td className="py-2 pr-4 whitespace-nowrap">{cls.startTime} a {cls.endTime}</td>
                                            <td className="py-2 pr-4">{cls.teacherSubject?.subject?.nombre || notice.subject?.nombre || '—'}</td>
                                            <td className="py-2">{cls.teacherSubject?.course?.nombre || notice.course?.nombre || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {isLateArrival && <p className="mt-3 text-sm text-amber-400">Llegada estimada: {notice.estimatedArrivalTime || 'No informada'}</p>}
                    </section>

                    <DetailSection
                        title="Registro y seguimiento"
                        icon={UserRound}
                    >
                        <DetailItem label="Creado por">
                            {fullName(creator)}
                        </DetailItem>

                        <DetailItem label="Fecha de creación">
                            {formatDateTime(notice.createdAt)}
                        </DetailItem>

                        <DetailItem label="Última modificación por">
                            {updater
                                ? fullName(updater)
                                : 'No disponible'}
                        </DetailItem>

                        <DetailItem label="Última modificación">
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
                    </DetailSection>

                    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                        <h3 className="text-sm font-semibold text-white">
                            Motivo del aviso
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                            {notice.reason || 'No especificado'}
                        </p>
                    </section>

                    {notice.status === 'REJECTED' && (
                        <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
                            <h3 className="text-sm font-semibold text-red-400">
                                Motivo del rechazo
                            </h3>

                            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-red-200">
                                {notice.rejectionReason ||
                                    'No especificado'}
                            </p>
                        </section>
                    )}
                </div>

                {/* PIE */}
                <div className="border-t border-slate-800 bg-slate-950/40 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
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
}) {
    const edit = canEdit(notice);
    const review = canReview(notice);
    const deactivate = canDeactivate(notice);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={() => onDetails(notice)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
            >
                <Eye size={15} />
                Ver detalles
            </button>

            {edit && (
                <button
                    type="button"
                    onClick={() => onEdit(notice)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
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
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCircle2 size={15} />
                        Confirmar
                    </button>

                    <button
                        type="button"
                        onClick={() => onReject(notice)}
                        disabled={isBusy}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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

    const filtered = notices.filter((notice) => {
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

    const ownsNotice = (notice) =>
        isTeacher &&
        Number(currentUser?.id) ===
        Number(notice.teacherUserId);

    const canReview = (notice) =>
        notice.isActive !== false &&
        notice.status === 'PENDING' &&
        ownsNotice(notice);

    const canEdit = (notice) =>
        notice.isActive !== false &&
        (
            ownsNotice(notice) ||
            (
                isAuthority &&
                notice.status === 'PENDING'
            )
        );

    const canDeactivate = (notice) =>
        isAuthority &&
        notice.isActive !== false;

    const isSaving =
        actions.create.isPending ||
        actions.createMultiple.isPending ||
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

    const openEdit = (notice) => {
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

    const handleSubmit = async (payload) => {
        try {
            clearMessages();

            if (editingNotice) {
                await actions.update.mutateAsync({
                    id: editingNotice.id,
                    data: payload,
                });

                setActionSuccess(
                    'El aviso se actualizó correctamente.'
                );
            } else {
                await (payload.classes
                    ? actions.createMultiple.mutateAsync(payload)
                    : actions.create.mutateAsync(payload));

                setActionSuccess(
                    'El aviso se creó correctamente.'
                );

                setPage(1);
            }

            setFormOpen(false);
            setEditingNotice(null);
        } catch (err) {
            setFormError(
                getErrorMessage(
                    err,
                    'No se pudo guardar el aviso.'
                )
            );
        }
    };

    const handleConfirm = async (notice) => {
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
                getErrorMessage(
                    err,
                    'No se pudo confirmar el aviso.'
                )
            );
        }
    };

    const handleReject = async (notice) => {
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
                getErrorMessage(
                    err,
                    'No se pudo rechazar el aviso.'
                )
            );
        }
    };

    const handleDeactivate = async (notice) => {
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
                getErrorMessage(
                    err,
                    'No se pudo desactivar el aviso.'
                )
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
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-7 px-3 py-5 text-slate-100 sm:px-6 sm:py-8">
            {/* ENCABEZADO */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                        <CalendarDays size={27} />
                    </div>

                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                            Gestión académica
                        </p>

                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Avisos Tempranos
                        </h1>

                        <p className="mt-2 text-sm text-slate-400">
                            Consultá las ausencias y llegadas tarde de docentes.
                        </p>
                    </div>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-500 sm:self-auto"
                    >
                        <Plus size={18} />
                        Nuevo aviso
                    </button>
                )}
            </div>

            <EarlyNoticeNotifications enabled={Boolean(currentUser)} />

            {/* INFORMACIÓN */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <AlertCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-400"
                />

                <p className="text-sm leading-relaxed text-blue-100/90">
                    Los avisos confirmados son los válidos para
                    informar a los alumnos. Los avisos pendientes
                    requieren confirmación del docente responsable.
                </p>
            </div>

            {/* FILTROS */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 md:flex-row">
                <div className="relative min-w-0 flex-1">
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Buscar por docente, materia, curso, motivo o creador..."
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                </div>

                {!isStudentOnly && (
                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}
                        className="cursor-pointer rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:w-52"
                    >
                        <option value="">Todos los estados</option>
                        <option value="CONFIRMED">Confirmados</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="REJECTED">Rechazados</option>
                    </select>
                )}
            </div>

            {/* MENSAJES */}
            {actionSuccess && (
                <div
                    role="status"
                    className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                >
                    <CheckCircle2 size={19} />
                    {actionSuccess}
                </div>
            )}

            {(error || actionError) && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
                >
                    <AlertCircle size={19} className="shrink-0" />
                    {actionError ||
                        getErrorMessage(
                            error,
                            'No se pudieron cargar los avisos.'
                        )}
                </div>
            )}

            {/* LISTADO */}
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl shadow-black/10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/30 px-5 py-5">
                    <div>
                        <h2 className="text-base font-semibold text-white">
                            Listado de avisos
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Ausencias y llegadas tarde registradas
                        </p>
                    </div>

                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300">
                        {filtered.length} en esta página
                    </span>
                </div>

                {/* MÓVIL */}
                <div className="space-y-3 p-4 md:hidden">
                    {isLoading && (
                        <div className="flex justify-center py-12">
                            <Loader2
                                size={28}
                                className="animate-spin text-blue-400"
                            />
                        </div>
                    )}

                    {!isLoading && filtered.length === 0 && (
                        <p className="py-12 text-center text-sm text-slate-500">
                            No se encontraron avisos.
                        </p>
                    )}

                    {!isLoading &&
                        filtered.map((notice) => (
                            <article
                                key={notice.id}
                                className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-800/40 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="break-words font-semibold text-white">
                                            {fullName(getTeacher(notice))}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-400">
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

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                                        {TYPES[notice.type] ||
                                            notice.type}
                                    </span>

                                    {notice.isActive === false && (
                                        <span className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300">
                                            Desactivado
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                                    <div className="flex items-start gap-3">
                                        <CalendarDays
                                            size={18}
                                            className="text-blue-400"
                                        />

                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Fecha de clase
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-200">
                                                {noticePeriod(notice)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Clock3
                                            size={18}
                                            className="text-blue-400"
                                        />

                                        <div>
                                            <p className="mb-1 text-xs text-slate-500">
                                                Horario
                                            </p>

                                            <ClassSchedule
                                                notice={notice}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-slate-700/70 pt-4">
                                    <NoticeActions
                                        notice={notice}
                                        {...actionProps}
                                    />
                                </div>
                            </article>
                        ))}
                </div>

                {/* ESCRITORIO */}
                <div className="hidden min-w-0 overflow-x-auto md:block">
                    <table className="w-full min-w-[850px] table-fixed text-left text-sm">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[23%]" />
                            <col className="w-[18%]" />
                            <col className="w-[15%]" />
                            <col className="w-[29%]" />
                        </colgroup>

                        <thead className="bg-slate-950/50">
                            <tr className="border-b border-slate-800">
                                {[
                                    'Estado',
                                    'Docente / Materia',
                                    'Fecha de clase',
                                    'Horario',
                                    'Acciones',
                                ].map((column) => (
                                    <th
                                        key={column}
                                        scope="col"
                                        className="px-3 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800/80">
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-14 text-center"
                                    >
                                        <Loader2
                                            size={28}
                                            className="mx-auto animate-spin text-blue-400"
                                        />
                                        <p className="mt-3 text-sm text-slate-400">
                                            Cargando avisos...
                                        </p>
                                    </td>
                                </tr>
                            )}

                            {!isLoading &&
                                filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-14 text-center text-slate-500"
                                        >
                                            No se encontraron avisos.
                                        </td>
                                    </tr>
                                )}

                            {!isLoading &&
                                filtered.map((notice) => (
                                    <tr
                                        key={notice.id}
                                        className="align-middle transition-colors hover:bg-slate-800/40"
                                    >
                                        <td className="px-3 py-5">
                                            <StatusBadge
                                                status={notice.status}
                                                compact
                                            />

                                            {notice.isActive === false && (
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Desactivado
                                                </p>
                                            )}
                                        </td>

                                        <td className="min-w-0 px-3 py-5">
                                            <p className="break-words font-semibold text-slate-100">
                                                {fullName(
                                                    getTeacher(notice)
                                                )}
                                            </p>

                                            <p className="mt-1 break-words text-xs text-slate-400">
                                                {notice.subject?.nombre ||
                                                    '—'}
                                            </p>

                                            <p className="mt-1 break-words text-xs text-slate-500">
                                                {notice.course?.nombre ||
                                                    '—'}
                                            </p>
                                        </td>

                                        <td className="px-3 py-5">
                                            <p className="font-medium text-slate-200">
                                                {noticePeriod(notice)}
                                            </p>

                                            <p className="mt-1 text-xs text-blue-400">
                                                {TYPES[notice.type] ||
                                                    notice.type}
                                            </p>
                                        </td>

                                        <td className="px-3 py-5">
                                            <ClassSchedule
                                                notice={notice}
                                            />
                                        </td>

                                        <td className="px-2 py-5">
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

            {/* PAGINACIÓN */}
            {pagination?.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() =>
                            setPage((current) =>
                                Math.max(1, current - 1)
                            )
                        }
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft size={18} />
                        Anterior
                    </button>

                    <span className="text-sm font-medium text-slate-400">
                        Página{' '}
                        <span className="text-white">{page}</span>
                        {' '}de{' '}
                        <span className="text-white">
                            {pagination.totalPages}
                        </span>
                    </span>

                    <button
                        type="button"
                        disabled={page >= pagination.totalPages}
                        onClick={() =>
                            setPage((current) => current + 1)
                        }
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Siguiente
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* MODALES */}
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
