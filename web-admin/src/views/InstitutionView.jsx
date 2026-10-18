
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Plus,
    Search,
    SlidersHorizontal,
    Pencil,
    Power,
    Trash2,
    MapPin,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertTriangle,
    ArrowRight,
    RefreshCw,
    School,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';

import {
    useInstitutions,
    useMyInstitution,
    useToggleInstitutionActive,
    useDeleteInstitution,
} from '../hooks/useInstitution';

import ConfirmDialog from '../components/ConfirmDialog';

export default function InstitutionView() {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const isSuperAdmin =
        user?.isSuperAdmin === true &&
        user?.roles?.includes('SUPER_ADMIN');

    const isDirector =
        user?.roles?.includes('DIRECTOR') === true;

    const globalQuery = useInstitutions(isSuperAdmin);

    const ownQuery = useMyInstitution(
        !isSuperAdmin && isDirector
    );

    const toggleMutation = useToggleInstitutionActive();
    const deleteMutation = useDeleteInstitution();

    const [deletingId, setDeletingId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const activeQuery = isSuperAdmin
        ? globalQuery
        : ownQuery;

    const { isLoading, isError, refetch } = activeQuery;

    const institutions = useMemo(() => {
        if (isSuperAdmin) {
            return Array.isArray(globalQuery.data)
                ? globalQuery.data
                : [];
        }

        return ownQuery.data ? [ownQuery.data] : [];
    }, [isSuperAdmin, globalQuery.data, ownQuery.data]);

    const filteredInstitutions = useMemo(() => {
        const normalizedSearch = search
            .trim()
            .toLocaleLowerCase('es-AR');

        return institutions.filter((institution) => {
            const searchableText = [
                institution.nombre,
                institution.cue,
                institution.distrito,
                institution.provincia,
                institution.direccion,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('es-AR');

            const matchesSearch =
                !normalizedSearch ||
                searchableText.includes(normalizedSearch);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && institution.isActive) ||
                (statusFilter === 'inactive' && !institution.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [institutions, search, statusFilter]);

    const totalInstitutions = institutions.length;

    const activeCount = institutions.filter(
        (institution) => institution.isActive
    ).length;

    const inactiveCount = totalInstitutions - activeCount;

    const handleToggle = (institution) => {
        if (toggleMutation.isPending) return;

        toggleMutation.mutate({
            id: institution.id,
            isActive: !institution.isActive,
        });
    };

    const handleDelete = () => {
        if (deletingId === null || deleteMutation.isPending) {
            return;
        }

        deleteMutation.mutate(deletingId, {
            onSuccess: () => setDeletingId(null),
        });
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
    };

    const handleEdit = (institution) => {
        navigate(
            `/dashboard/institution/${institution.id}/edit`
        );
    };

    if (!isSuperAdmin && !isDirector) {
        return (
            <div className="mx-auto flex min-h-[65vh] max-w-lg items-center justify-center px-4">
                <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                        <AlertTriangle size={28} />
                    </div>

                    <h2 className="text-xl font-semibold text-white">
                        Acceso restringido
                    </h2>

                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                        No tenés permisos para consultar instituciones.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[65vh] items-center justify-center">
                <div className="text-center">
                    <Loader2
                        size={34}
                        className="mx-auto animate-spin text-blue-400"
                    />

                    <p className="mt-4 text-sm text-slate-400">
                        Cargando instituciones...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-7 px-3 py-5 text-slate-100 sm:px-6 sm:py-8">
            {/* ENCABEZADO */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-950/20">
                        <Building2 size={28} strokeWidth={1.8} />
                    </div>

                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                            Gestión institucional
                        </p>

                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            {isSuperAdmin
                                ? 'Instituciones'
                                : 'Mi institución'}
                        </h1>

                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {isSuperAdmin
                                ? 'Administrá los establecimientos educativos registrados en EduQuest.'
                                : 'Consultá y actualizá la información de tu institución educativa.'}
                        </p>
                    </div>
                </div>

                {isSuperAdmin && (
                    <button
                        type="button"
                        onClick={() =>
                            navigate('/dashboard/institution/new')
                        }
                        className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-all hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 sm:self-auto"
                    >
                        <Plus size={18} />
                        Agregar institución
                    </button>
                )}
            </div>

            {/* INDICADORES */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-black/5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400">
                            Total de instituciones
                        </span>

                        <School size={20} className="text-blue-400" />
                    </div>

                    <p className="mt-4 text-3xl font-bold tracking-tight text-white">
                        {totalInstitutions}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Establecimientos registrados
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-black/5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400">
                            Instituciones activas
                        </span>

                        <CheckCircle2
                            size={20}
                            className="text-emerald-400"
                        />
                    </div>

                    <p className="mt-4 text-3xl font-bold tracking-tight text-white">
                        {activeCount}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Actualmente habilitadas
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-black/5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400">
                            Instituciones inactivas
                        </span>

                        <XCircle
                            size={20}
                            className="text-slate-400"
                        />
                    </div>

                    <p className="mt-4 text-3xl font-bold tracking-tight text-white">
                        {inactiveCount}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Actualmente deshabilitadas
                    </p>
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl shadow-black/10">
                {/* BARRA DE FILTROS */}
                <div className="border-b border-slate-800 p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Listado de instituciones
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {filteredInstitutions.length}{' '}
                                {filteredInstitutions.length === 1
                                    ? 'institución encontrada'
                                    : 'instituciones encontradas'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={activeQuery.isFetching}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw
                                size={15}
                                className={
                                    activeQuery.isFetching
                                        ? 'animate-spin'
                                        : ''
                                }
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
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, CUE, distrito o provincia..."
                                aria-label="Buscar instituciones"
                                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div className="relative md:w-52">
                            <SlidersHorizontal
                                size={17}
                                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value)
                                }
                                aria-label="Filtrar por estado"
                                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-700/80 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none transition-all hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="active">Activas</option>
                                <option value="inactive">Inactivas</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ERROR DE CARGA */}
                {isError ? (
                    <div className="m-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300 sm:m-6">
                        <AlertTriangle size={20} className="shrink-0" />
                        No se pudieron cargar las instituciones.
                    </div>
                ) : filteredInstitutions.length === 0 ? (
                    /* ESTADO VACÍO */
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/50 text-slate-400">
                            <Building2 size={30} strokeWidth={1.6} />
                        </div>

                        <h3 className="text-lg font-semibold text-white">
                            {institutions.length === 0
                                ? 'Todavía no hay instituciones'
                                : 'No se encontraron resultados'}
                        </h3>

                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                            {institutions.length === 0
                                ? 'Cuando se registren instituciones, aparecerán en este listado.'
                                : 'Probá con otros términos de búsqueda o cambiá los filtros seleccionados.'}
                        </p>

                        {institutions.length > 0 && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                            >
                                Limpiar filtros
                            </button>
                        )}

                        {institutions.length === 0 && isSuperAdmin && (
                            <button
                                type="button"
                                onClick={() =>
                                    navigate('/dashboard/institution/new')
                                }
                                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                            >
                                <Plus size={17} />
                                Crear institución
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* TABLA */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-slate-950/40">
                                    <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="px-6 py-4">
                                            Institución
                                        </th>
                                        <th className="px-5 py-4">
                                            CUE
                                        </th>
                                        <th className="px-5 py-4">
                                            Ubicación
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
                                    {filteredInstitutions.map((institution) => (
                                        <tr
                                            key={institution.id}
                                            className="group transition-colors hover:bg-slate-800/35"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/10 bg-blue-500/10 text-blue-400">
                                                        <Building2 size={19} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="max-w-xs truncate font-semibold text-slate-100">
                                                            {institution.nombre}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            ID #{institution.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-5">
                                                <span className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 font-mono text-xs text-slate-300">
                                                    {institution.cue || '—'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-5">
                                                <div className="flex items-start gap-2">
                                                    <MapPin
                                                        size={15}
                                                        className="mt-0.5 shrink-0 text-slate-500"
                                                    />

                                                    <div>
                                                        <p className="text-slate-300">
                                                            {institution.distrito || 'Sin distrito'}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {institution.provincia || 'Sin provincia'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-5">
                                                <span
                                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${institution.isActive
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                                            : 'border-slate-600/50 bg-slate-700/30 text-slate-400'
                                                        }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${institution.isActive
                                                                ? 'bg-emerald-400'
                                                                : 'bg-slate-500'
                                                            }`}
                                                    />
                                                    {institution.isActive
                                                        ? 'Activa'
                                                        : 'Inactiva'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleEdit(institution)
                                                        }
                                                        title="Editar institución"
                                                        aria-label={`Editar ${institution.nombre}`}
                                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                                                    >
                                                        <Pencil size={14} />
                                                        Editar
                                                    </button>

                                                    {isSuperAdmin && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={toggleMutation.isPending}
                                                                onClick={() =>
                                                                    handleToggle(institution)
                                                                }
                                                                title={
                                                                    institution.isActive
                                                                        ? 'Desactivar institución'
                                                                        : 'Activar institución'
                                                                }
                                                                aria-label={
                                                                    institution.isActive
                                                                        ? `Desactivar ${institution.nombre}`
                                                                        : `Activar ${institution.nombre}`
                                                                }
                                                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <Power size={16} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setDeletingId(institution.id)
                                                                }
                                                                title="Eliminar institución"
                                                                aria-label={`Eliminar ${institution.nombre}`}
                                                                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* PIE DE TABLA */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/30 px-6 py-4">
                            <p className="text-xs text-slate-500">
                                Mostrando{' '}
                                <span className="font-semibold text-slate-300">
                                    {filteredInstitutions.length}
                                </span>{' '}
                                de{' '}
                                <span className="font-semibold text-slate-300">
                                    {totalInstitutions}
                                </span>{' '}
                                instituciones
                            </p>

                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <ArrowRight size={14} />
                                Administrá las instituciones desde las acciones
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* ERROR DE OPERACIONES */}
            {(toggleMutation.isError || deleteMutation.isError) && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
                >
                    <AlertTriangle size={19} className="shrink-0" />
                    <span>
                        {toggleMutation.error?.response?.data?.message ||
                            deleteMutation.error?.response?.data?.message ||
                            'No se pudo completar la operación. Intentá nuevamente.'}
                    </span>
                </div>
            )}

            {/* CONFIRMACIÓN DE ELIMINACIÓN */}
            {isSuperAdmin && (
                <ConfirmDialog
                    open={deletingId !== null}
                    title="Eliminar institución"
                    message="Esta acción no se puede deshacer. Si la institución tiene usuarios o datos asociados, la eliminación será rechazada."
                    confirmLabel={
                        deleteMutation.isPending
                            ? 'Eliminando...'
                            : 'Eliminar'
                    }
                    onCancel={() => {
                        if (!deleteMutation.isPending) {
                            setDeletingId(null);
                        }
                    }}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}
