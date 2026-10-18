
import { useContext, useEffect, useState } from 'react';
import {
    useNavigate,
    useParams,
} from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';

import {
    useInstitution,
    useMyInstitution,
    useCreateInstitution,
    useUpdateInstitution,
    useUpdateInstitutionAdmin,
} from '../hooks/useInstitution';

const EMPTY_FORM = {
    nombre: '',
    cue: '',
    distrito: 'La Plata',
    provincia: 'Buenos Aires',
    direccion: '',
    telefono: '',
};

export default function InstitutionFormView() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useContext(AuthContext);

    const editing = Boolean(id);

    const isSuperAdmin =
        user?.isSuperAdmin === true &&
        user?.roles?.includes('SUPER_ADMIN');

    const isDirector =
        user?.roles?.includes('DIRECTOR') === true;

    const canAccess =
        isSuperAdmin || (isDirector && editing);

    const globalQuery = useInstitution(
        id,
        editing && isSuperAdmin
    );

    const ownQuery = useMyInstitution(
        editing && !isSuperAdmin && isDirector
    );

    const institution = isSuperAdmin
        ? globalQuery.data
        : ownQuery.data;

    const isLoading = isSuperAdmin
        ? globalQuery.isLoading
        : ownQuery.isLoading;

    const isError = isSuperAdmin
        ? globalQuery.isError
        : ownQuery.isError;

    const createMutation = useCreateInstitution();
    const updateOwnMutation = useUpdateInstitution();
    const updateAdminMutation = useUpdateInstitutionAdmin();

    const mutation = !editing
        ? createMutation
        : isSuperAdmin
            ? updateAdminMutation
            : updateOwnMutation;

    const [form, setForm] = useState(EMPTY_FORM);

    const isOwnInstitution =
        institution &&
        Number(institution.id) === Number(id);

    const canEditTarget =
        isSuperAdmin || isOwnInstitution;

    useEffect(() => {
        if (!institution) return;

        setForm({
            nombre: institution.nombre ?? '',
            cue: institution.cue ?? '',
            distrito: institution.distrito ?? '',
            provincia: institution.provincia ?? '',
            direccion: institution.direccion ?? '',
            telefono: institution.telefono ?? '',
        });
    }, [institution]);

    const handleChange = (e) => {
        setForm((current) => ({
            ...current,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!canAccess) return;

        if (editing) {
            if (!canEditTarget) return;

            const { cue, ...updatePayload } = form;

            if (isSuperAdmin) {
                updateAdminMutation.mutate(
                    {
                        id: Number(id),
                        ...updatePayload,
                    },
                    {
                        onSuccess: () =>
                            navigate('/dashboard/institution'),
                    }
                );
            } else {
                updateOwnMutation.mutate(
                    updatePayload,
                    {
                        onSuccess: () =>
                            navigate('/dashboard/institution'),
                    }
                );
            }

            return;
        }

        if (!isSuperAdmin) return;

        createMutation.mutate(form, {
            onSuccess: () =>
                navigate('/dashboard/institution'),
        });
    };

    if (!canAccess) {
        return (
            <div className="text-red-400">
                No tenés permisos para realizar esta operación.
            </div>
        );
    }

    if (editing && isLoading) {
        return (
            <p className="text-slate-400">
                Cargando institución...
            </p>
        );
    }

    if (editing && isError) {
        return (
            <p className="text-red-400">
                No se pudo cargar la institución.
            </p>
        );
    }

    if (editing && !institution) {
        return (
            <p className="text-red-400">
                No se encontró la institución.
            </p>
        );
    }

    if (editing && !canEditTarget) {
        return (
            <p className="text-red-400">
                No podés editar una institución distinta de la tuya.
            </p>
        );
    }

    const errorMessage =
        mutation.error?.response?.data?.message ||
        mutation.error?.response?.data?.error ||
        (mutation.isError
            ? 'No se pudo guardar la institución.'
            : null);

    return (
        <div>
            <div className="mb-6">
                <button
                    type="button"
                    onClick={() =>
                        navigate('/dashboard/institution')
                    }
                    className="text-sm text-slate-500 hover:text-slate-300 mb-4 cursor-pointer"
                >
                    ← Volver a instituciones
                </button>

                <h2 className="text-2xl font-bold">
                    {editing
                        ? 'Editar institución'
                        : 'Agregar institución'}
                </h2>

                <p className="text-sm text-slate-400 mt-2">
                    {editing
                        ? 'Modificá los datos de la institución.'
                        : 'Completá los datos para registrar una nueva institución.'}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
            >
                <div>
                    <label className="block text-sm text-slate-400 mb-2">
                        Nombre
                    </label>

                    <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">
                        CUE
                    </label>

                    <input
                        name="cue"
                        value={form.cue}
                        onChange={handleChange}
                        required
                        disabled={editing}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm disabled:opacity-50"
                    />

                    {editing && (
                        <p className="text-xs text-slate-500 mt-1">
                            El CUE no puede modificarse.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Distrito
                        </label>

                        <input
                            name="distrito"
                            value={form.distrito}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Provincia
                        </label>

                        <input
                            name="provincia"
                            value={form.provincia}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">
                        Dirección
                    </label>

                    <input
                        name="direccion"
                        value={form.direccion}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">
                        Teléfono
                    </label>

                    <input
                        name="telefono"
                        value={form.telefono}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                </div>

                {errorMessage && (
                    <div className="bg-red-900/20 border border-red-900/40 text-red-400 rounded p-3 text-sm">
                        {errorMessage}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() =>
                            navigate('/dashboard/institution')
                        }
                        className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm cursor-pointer"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {mutation.isPending
                            ? 'Guardando...'
                            : editing
                                ? 'Guardar cambios'
                                : 'Crear institución'}
                    </button>
                </div>
            </form>
        </div>
    );
}
