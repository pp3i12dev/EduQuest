
import { useState, useContext, useMemo, useEffect } from 'react';
import {
    Mail,
    MailPlus,
    Search,
    Plus,
    X,
    Send,
    Loader2,
    Clock3,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    GraduationCap,
    BookOpen,
    Users,
    CalendarDays,
    RefreshCw,
    Inbox,
    Ban,
} from 'lucide-react';

import {
    useInvitations,
    useCreateInvitation,
    useCancelInvitation,
} from '../hooks/useInvitations';

import {
    useCareers,
    useCoursesByCareer,
} from '../hooks/useAcademic';

import { AuthContext } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

const ROLE_LABELS = {
    DIRECTOR: 'Directivo',
    PRECEPTOR: 'Preceptor',
    TEACHER: 'Docente',
    STUDENT: 'Alumno',
};

const getErrorMessage = (error) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Ocurrió un error al procesar la solicitud.';

const inputClass =
    'w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50';

const labelClass =
    'mb-2 block text-sm font-medium text-slate-300';

const getInvitationStatus = (invitation) => {
    if (invitation.isUsed) return 'used';

    if (
        invitation.expiresAt &&
        new Date(invitation.expiresAt).getTime() <= Date.now()
    ) {
        return 'expired';
    }

    return 'pending';
};

const STATUS_CONFIG = {
    pending: {
        label: 'Pendiente',
        className:
            'border-amber-500/20 bg-amber-500/10 text-amber-400',
        dot: 'bg-amber-400',
    },
    used: {
        label: 'Utilizada',
        className:
            'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        dot: 'bg-emerald-400',
    },
    expired: {
        label: 'Vencida',
        className:
            'border-red-500/20 bg-red-500/10 text-red-400',
        dot: 'bg-red-400',
    },
};

function InviteForm({ onSubmit, onClose, isSaving, error }) {
    const { user } = useContext(AuthContext);

    const isOnlyTeacher =
        user?.roles?.length === 1 &&
        user.roles[0] === 'TEACHER';

    const [email, setEmail] = useState('');
    const [role, setRole] = useState(
        isOnlyTeacher ? 'STUDENT' : 'TEACHER'
    );
    const [careerId, setCareerId] = useState('');
    const [courseId, setCourseId] = useState('');

    const { data: careers } = useCareers(user?.institutionId);
    const { data: courses } = useCoursesByCareer(careerId);

    const availableRoles = isOnlyTeacher
        ? ['STUDENT']
        : ['DIRECTOR', 'PRECEPTOR', 'TEACHER', 'STUDENT'];

    const requiresCourse =
        role === 'STUDENT' && isOnlyTeacher;

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && !isSaving) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose, isSaving]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (isSaving) return;
        if (requiresCourse && !courseId) return;

        onSubmit({
            email: email.trim(),
            role,
            ...(requiresCourse ? { courseId } : {}),
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSaving) {
                    onClose();
                }
            }}
        >
            <form
                onSubmit={handleSubmit}
                role="dialog"
                aria-modal="true"
                aria-labelledby="invite-dialog-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
            >
                {/* ENCABEZADO */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                            <MailPlus size={22} />
                        </div>

                        <div>
                            <h2
                                id="invite-dialog-title"
                                className="text-lg font-semibold text-white"
                            >
                                Nueva invitación
                            </h2>

                            <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                Invitá a una persona a formar parte de EduQuest.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="Cerrar formulario"
                        className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* CAMPOS */}
                <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
                    <div>
                        <label htmlFor="invite-role" className={labelClass}>
                            Rol de la persona
                            <span className="ml-1 text-blue-400">*</span>
                        </label>

                        <div className="relative">
                            <Users
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                            />

                            <select
                                id="invite-role"
                                value={role}
                                onChange={(event) =>
                                    setRole(event.target.value)
                                }
                                disabled={isSaving}
                                className={`${inputClass} cursor-pointer pl-11`}
                            >
                                {availableRoles.map((availableRole) => (
                                    <option
                                        key={availableRole}
                                        value={availableRole}
                                    >
                                        {ROLE_LABELS[availableRole]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="invite-email" className={labelClass}>
                            Correo electrónico
                            <span className="ml-1 text-blue-400">*</span>
                        </label>

                        <div className="relative">
                            <Mail
                                size={18}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                            />

                            <input
                                id="invite-email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="nombre@ejemplo.com"
                                autoComplete="email"
                                required
                                disabled={isSaving}
                                className={`${inputClass} pl-11`}
                            />
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            La invitación se asociará a este correo electrónico.
                        </p>
                    </div>

                    {requiresCourse && (
                        <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="flex items-center gap-2">
                                <GraduationCap
                                    size={18}
                                    className="text-blue-400"
                                />

                                <div>
                                    <h3 className="text-sm font-semibold text-white">
                                        Asignación académica
                                    </h3>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Seleccioná el curso del alumno.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="invite-career"
                                    className={labelClass}
                                >
                                    Carrera o nivel
                                    <span className="ml-1 text-blue-400">*</span>
                                </label>

                                <select
                                    id="invite-career"
                                    value={careerId}
                                    onChange={(event) => {
                                        setCareerId(event.target.value);
                                        setCourseId('');
                                    }}
                                    required
                                    disabled={isSaving}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">
                                        Seleccioná una carrera o nivel
                                    </option>

                                    {careers?.map((career) => (
                                        <option
                                            key={career.id}
                                            value={career.id}
                                        >
                                            {career.nombre}
                                            {career.level
                                                ? ` (${career.level})`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="invite-course"
                                    className={labelClass}
                                >
                                    Curso
                                    <span className="ml-1 text-blue-400">*</span>
                                </label>

                                <div className="relative">
                                    <BookOpen
                                        size={17}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                    />

                                    <select
                                        id="invite-course"
                                        value={courseId}
                                        onChange={(event) =>
                                            setCourseId(event.target.value)
                                        }
                                        disabled={!careerId || isSaving}
                                        required
                                        className={`${inputClass} cursor-pointer pl-11`}
                                    >
                                        <option value="">
                                            {careerId
                                                ? 'Seleccioná un curso'
                                                : 'Primero elegí una carrera'}
                                        </option>

                                        {courses?.map((course) => (
                                            <option
                                                key={course.id}
                                                value={course.id}
                                            >
                                                {course.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
                        >
                            <AlertTriangle
                                size={19}
                                className="mt-0.5 shrink-0"
                            />

                            <span>{getErrorMessage(error)}</span>
                        </div>
                    )}
                </div>

                {/* ACCIONES */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950/40 px-6 py-5 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving || (requiresCourse && !courseId)}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={17} />
                                Enviar invitación
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function InvitationsListView() {
    const {
        data: invitations,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useInvitations();

    const cancelMutation = useCancelInvitation();
    const createMutation = useCreateInvitation();

    const [formOpen, setFormOpen] = useState(false);
    const [cancelingId, setCancelingId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const invitationList = Array.isArray(invitations)
        ? invitations
        : [];

    const stats = useMemo(() => {
        const result = {
            total: invitationList.length,
            pending: 0,
            used: 0,
            expired: 0,
        };

        invitationList.forEach((invitation) => {
            const status = getInvitationStatus(invitation);
            result[status] += 1;
        });

        return result;
    }, [invitations]);

    const filteredInvitations = useMemo(() => {
        const normalizedSearch = search
            .trim()
            .toLocaleLowerCase('es-AR');

        return invitationList.filter((invitation) => {
            const searchableText = [
                invitation.email,
                ROLE_LABELS[invitation.role],
                invitation.role,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('es-AR');

            const matchesSearch =
                !normalizedSearch ||
                searchableText.includes(normalizedSearch);

            const matchesStatus =
                statusFilter === 'all' ||
                getInvitationStatus(invitation) === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [invitations, search, statusFilter]);

    const openForm = () => {
        createMutation.reset();
        setFormOpen(true);
    };

    const closeForm = () => {
        if (!createMutation.isPending) {
            setFormOpen(false);
        }
    };

    const handleCancelInvitation = () => {
        if (cancelingId === null || cancelMutation.isPending) {
            return;
        }

        cancelMutation.mutate(cancelingId, {
            onSuccess: () => setCancelingId(null),
        });
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '—';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return '—';

        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="mx-auto w-full max-w-7xl space-y-7 px-3 py-5 text-slate-100 sm:px-6 sm:py-8">
            {/* ENCABEZADO */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-950/20">
                        <MailPlus size={28} strokeWidth={1.8} />
                    </div>

                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                            Gestión de usuarios
                        </p>

                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Invitaciones
                        </h1>

                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            Administrá las invitaciones para incorporar personas a EduQuest.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openForm}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-all hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 sm:self-auto"
                >
                    <Plus size={18} />
                    Nueva invitación
                </button>
            </div>

            {/* ESTADÍSTICAS */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    {
                        label: 'Total',
                        value: stats.total,
                        icon: Mail,
                        color: 'text-blue-400',
                    },
                    {
                        label: 'Pendientes',
                        value: stats.pending,
                        icon: Clock3,
                        color: 'text-amber-400',
                    },
                    {
                        label: 'Utilizadas',
                        value: stats.used,
                        icon: CheckCircle2,
                        color: 'text-emerald-400',
                    },
                    {
                        label: 'Vencidas',
                        value: stats.expired,
                        icon: XCircle,
                        color: 'text-red-400',
                    },
                ].map((stat) => {
                    const StatIcon = stat.icon;

                    return (
                        <div
                            key={stat.label}
                            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-black/5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-slate-400">
                                    {stat.label}
                                </span>

                                <StatIcon
                                    size={20}
                                    className={stat.color}
                                />
                            </div>

                            <p className="mt-4 text-3xl font-bold tracking-tight text-white">
                                {stat.value}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* LISTADO */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl shadow-black/10">
                {/* FILTROS */}
                <div className="border-b border-slate-800 p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Listado de invitaciones
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {filteredInvitations.length}{' '}
                                {filteredInvitations.length === 1
                                    ? 'invitación encontrada'
                                    : 'invitaciones encontradas'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw
                                size={15}
                                className={isFetching ? 'animate-spin' : ''}
                            />
                            Actualizar
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
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
                                placeholder="Buscar por correo electrónico o rol..."
                                aria-label="Buscar invitaciones"
                                className={`${inputClass} pl-11`}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            aria-label="Filtrar invitaciones por estado"
                            className={`${inputClass} cursor-pointer md:w-52`}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendientes</option>
                            <option value="used">Utilizadas</option>
                            <option value="expired">Vencidas</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2
                            size={32}
                            className="animate-spin text-blue-400"
                        />
                        <p className="mt-4 text-sm text-slate-400">
                            Cargando invitaciones...
                        </p>
                    </div>
                ) : isError ? (
                    <div className="m-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
                        <AlertTriangle size={20} className="shrink-0" />
                        No se pudieron cargar las invitaciones.
                    </div>
                ) : filteredInvitations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/50 text-slate-400">
                            <Inbox size={30} strokeWidth={1.6} />
                        </div>

                        <h3 className="text-lg font-semibold text-white">
                            {invitationList.length === 0
                                ? 'Todavía no hay invitaciones'
                                : 'No se encontraron resultados'}
                        </h3>

                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                            {invitationList.length === 0
                                ? 'Creá una invitación para comenzar a incorporar usuarios a la institución.'
                                : 'Probá con otro correo, rol o filtro de estado.'}
                        </p>

                        {invitationList.length === 0 ? (
                            <button
                                type="button"
                                onClick={openForm}
                                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                            >
                                <Plus size={17} />
                                Crear invitación
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-left text-sm">
                                <thead className="bg-slate-950/40">
                                    <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="px-6 py-4">
                                            Destinatario
                                        </th>
                                        <th className="px-5 py-4">
                                            Rol
                                        </th>
                                        <th className="px-5 py-4">
                                            Vencimiento
                                        </th>
                                        <th className="px-5 py-4">
                                            Estado
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-800/80">
                                    {filteredInvitations.map((invitation) => {
                                        const status = getInvitationStatus(
                                            invitation
                                        );

                                        const statusConfig =
                                            STATUS_CONFIG[status];

                                        return (
                                            <tr
                                                key={invitation.id}
                                                className="transition-colors hover:bg-slate-800/35"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                                            <Mail size={18} />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="max-w-xs truncate font-medium text-slate-100">
                                                                {invitation.email || 'Sin correo'}
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Invitación #{invitation.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <span className="rounded-lg border border-blue-500/10 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                                                        {ROLE_LABELS[invitation.role] ||
                                                            invitation.role}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <CalendarDays
                                                            size={16}
                                                            className="text-slate-500"
                                                        />
                                                        {formatDate(
                                                            invitation.expiresAt
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <span
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusConfig.className}`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`}
                                                        />
                                                        {statusConfig.label}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-5">
                                                    <div className="flex justify-end">
                                                        {status === 'pending' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCancelingId(
                                                                        invitation.id
                                                                    )
                                                                }
                                                                disabled={cancelMutation.isPending}
                                                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <Ban size={15} />
                                                                Cancelar
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-600">
                                                                Sin acciones
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/30 px-6 py-4">
                            <p className="text-xs text-slate-500">
                                Mostrando{' '}
                                <span className="font-semibold text-slate-300">
                                    {filteredInvitations.length}
                                </span>{' '}
                                de{' '}
                                <span className="font-semibold text-slate-300">
                                    {invitationList.length}
                                </span>{' '}
                                invitaciones
                            </p>

                            <span className="text-xs text-slate-500">
                                Gestión de accesos · EduQuest
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* ERROR AL CANCELAR */}
            {cancelMutation.isError && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
                >
                    <AlertTriangle size={19} className="shrink-0" />
                    {getErrorMessage(cancelMutation.error)}
                </div>
            )}

            {/* MODAL DE CREACIÓN */}
            {formOpen && (
                <InviteForm
                    isSaving={createMutation.isPending}
                    error={createMutation.error}
                    onClose={closeForm}
                    onSubmit={(payload) =>
                        createMutation.mutate(payload, {
                            onSuccess: () => setFormOpen(false),
                        })
                    }
                />
            )}

            {/* CONFIRMACIÓN DE CANCELACIÓN */}
            <ConfirmDialog
                open={cancelingId !== null}
                title="Cancelar invitación"
                message="¿Querés cancelar esta invitación? La persona ya no podrá utilizarla para registrarse."
                confirmLabel={
                    cancelMutation.isPending
                        ? 'Cancelando...'
                        : 'Cancelar invitación'
                }
                onCancel={() => {
                    if (!cancelMutation.isPending) {
                        setCancelingId(null);
                    }
                }}
                onConfirm={handleCancelInvitation}
            />
        </div>
    );
}
