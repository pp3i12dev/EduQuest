
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

    if (!isSuperAdmin && !isDirector) {
        return (
            <p className="text-red-400">
                No tenés permisos para consultar instituciones.
            </p>
        );
    }

    const activeQuery = isSuperAdmin
        ? globalQuery
        : ownQuery;

    const {
        isLoading,
        isError,
    } = activeQuery;

    const institutions = isSuperAdmin
        ? (Array.isArray(globalQuery.data)
            ? globalQuery.data
            : [])
        : (ownQuery.data
            ? [ownQuery.data]
            : []);

    if (isLoading) {
        return (
            <p className="text-slate-400">
                Cargando instituciones...
            </p>
        );
    }

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold">
                        {isSuperAdmin
                            ? 'Instituciones'
                            : 'Mi institución'}
                    </h2>

                    <p className="text-sm text-slate-400 mt-2">
                        {isSuperAdmin
                            ? 'Administrá las instituciones registradas.'
                            : 'Consultá y editá los datos de tu institución.'}
                    </p>
                </div>

                {isSuperAdmin && (
                    <button
                        type="button"
                        onClick={() =>
                            navigate('/dashboard/institution/new')
                        }
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium cursor-pointer"
                    >
                        + Agregar institución
                    </button>
                )}
            </div>

            {isError ? (
                <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-5 text-red-400">
                    No se pudieron cargar las instituciones.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-800">
                                <th className="py-3">Nombre</th>
                                <th>CUE</th>
                                <th>Distrito</th>
                                <th>Provincia</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {institutions.map((institution) => (
                                <tr
                                    key={institution.id}
                                    className="border-b border-slate-900 hover:bg-slate-900/50"
                                >
                                    <td className="py-3 font-medium">
                                        {institution.nombre}
                                    </td>

                                    <td>{institution.cue}</td>
                                    <td>{institution.distrito}</td>
                                    <td>{institution.provincia}</td>

                                    <td>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${institution.isActive
                                                    ? 'bg-emerald-600/20 text-emerald-400'
                                                    : 'bg-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {institution.isActive
                                                ? 'Activa'
                                                : 'Inactiva'}
                                        </span>
                                    </td>

                                    <td className="text-right space-x-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/dashboard/institution/${institution.id}/edit`
                                                )
                                            }
                                            className="text-blue-400 hover:underline text-xs cursor-pointer"
                                        >
                                            Editar
                                        </button>

                                        {isSuperAdmin && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={toggleMutation.isPending}
                                                    onClick={() =>
                                                        toggleMutation.mutate({
                                                            id: institution.id,
                                                            isActive: !institution.isActive,
                                                        })
                                                    }
                                                    className="text-amber-400 hover:underline text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {institution.isActive
                                                        ? 'Desactivar'
                                                        : 'Activar'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeletingId(institution.id)
                                                    }
                                                    className="text-red-400 hover:underline text-xs cursor-pointer"
                                                >
                                                    Eliminar
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {institutions.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-8 text-center text-slate-500"
                                    >
                                        No hay instituciones para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isSuperAdmin && (
                <ConfirmDialog
                    open={deletingId !== null}
                    title="Eliminar institución"
                    message="Esta acción no se puede deshacer. Si la institución tiene usuarios o datos asociados, la eliminación será rechazada."
                    confirmLabel="Eliminar"
                    onCancel={() => setDeletingId(null)}
                    onConfirm={() =>
                        deleteMutation.mutate(deletingId, {
                            onSuccess: () => setDeletingId(null),
                        })
                    }
                />
            )}
        </div>
    );
}
