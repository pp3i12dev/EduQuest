
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    Check,
    Loader2,
    MapPin,
    Phone,
    Save,
    ShieldAlert,
    Info,
} from 'lucide-react';

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

const inputClass =
    'w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 hover:border-slate-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50';

const labelClass =
    'mb-2 block text-sm font-medium text-slate-300';

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

    const goBack = () => {
        navigate('/dashboard/institution');
    };

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

        if (!canAccess || mutation.isPending) return;

        if (editing) {
            if (!canEditTarget) return;

            const { cue, ...updatePayload } = form;

            if (isSuperAdmin) {
                updateAdminMutation.mutate(
                    {
                        id: Number(id),
                        ...updatePayload,
                    },
                    { onSuccess: goBack }
                );
            } else {
                updateOwnMutation.mutate(
                    updatePayload,
                    { onSuccess: goBack }
                );
            }

            return;
        }

        if (!isSuperAdmin) return;

        createMutation.mutate(form, {
            onSuccess: goBack,
        });
    };

    const StatusMessage = ({ children, error = false }) => (
        <div className="flex min-h-[65vh] items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-xl">
                <div
                    className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${error
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                >
                    {error ? (
                        <ShieldAlert size={28} />
                    ) : (
                        <Loader2 size={28} className="animate-spin" />
                    )}
                </div>

                <p className="text-sm leading-relaxed text-slate-300">
                    {children}
                </p>

                {error && (
                    <button
                        type="button"
                        onClick={goBack}
                        className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                    >
                        <ArrowLeft size={16} />
                        Volver
                    </button>
                )}
            </div>
        </div>
    );

    if (!canAccess) {
        return (
            <StatusMessage error>
                No tenés permisos para realizar esta operación.
            </StatusMessage>
        );
    }

    if (editing && isLoading) {
        return (
            <StatusMessage>
                Cargando información de la institución...
            </StatusMessage>
        );
    }

    if (editing && isError) {
        return (
            <StatusMessage error>
                No se pudo cargar la institución.
            </StatusMessage>
        );
    }

    if (editing && !institution) {
        return (
            <StatusMessage error>
                No se encontró la institución solicitada.
            </StatusMessage>
        );
    }

    if (editing && !canEditTarget) {
        return (
            <StatusMessage error>
                No podés editar una institución distinta de la tuya.
            </StatusMessage>
        );
    }

    const errorMessage =
        mutation.error?.response?.data?.message ||
        mutation.error?.response?.data?.error ||
        (mutation.isError
            ? 'No se pudo guardar la institución.'
            : null);

    return (
        <div className="mx-auto w-full max-w-3xl px-3 py-5 text-slate-100 sm:px-6 sm:py-8">
            {/* NAVEGACIÓN */}
            <button
                type="button"
                onClick={goBack}
                className="group mb-7 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-blue-400"
            >
                <ArrowLeft
                    size={17}
                    className="transition-transform group-hover:-translate-x-1"
                />
                Volver a instituciones
            </button>

            {/* ENCABEZADO */}
            <div className="mb-8 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-950/20">
                    <Building2 size={28} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                        Gestión institucional
                    </p>

                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {editing
                            ? 'Editar institución'
                            : 'Nueva institución'}
                    </h1>

                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {editing
                            ? 'Actualizá la información general, ubicación y datos de contacto de la institución.'
                            : 'Completá los datos necesarios para incorporar una nueva institución a EduQuest.'}
                    </p>
                </div>
            </div>

            {/* FORMULARIO */}
            <form
                onSubmit={handleSubmit}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-black/10"
            >
                {/* SECCIÓN: DATOS INSTITUCIONALES */}
                <section className="p-5 sm:p-7">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                            <Building2 size={20} />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Datos institucionales
                            </h2>
                            <p className="text-xs text-slate-500">
                                Información principal del establecimiento
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label htmlFor="nombre" className={labelClass}>
                                Nombre de la institución
                                <span className="ml-1 text-blue-400">*</span>
                            </label>

                            <input
                                id="nombre"
                                name="nombre"
                                type="text"
                                value={form.nombre}
                                onChange={handleChange}
                                placeholder="Ej. Instituto Superior de Formación"
                                required
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="cue" className={labelClass}>
                                Clave Única de Establecimiento (CUE)
                                <span className="ml-1 text-blue-400">*</span>
                            </label>

                            <input
                                id="cue"
                                name="cue"
                                type="text"
                                value={form.cue}
                                onChange={handleChange}
                                placeholder="Ingresá el CUE"
                                required
                                disabled={editing}
                                className={inputClass}
                            />

                            {editing && (
                                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                    <Info size={14} className="shrink-0" />
                                    El CUE es un identificador único y no puede modificarse.
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <div className="mx-5 border-t border-slate-800 sm:mx-7" />

                {/* SECCIÓN: UBICACIÓN */}
                <section className="p-5 sm:p-7">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                            <MapPin size={20} />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Ubicación
                            </h2>
                            <p className="text-xs text-slate-500">
                                Datos de localización de la institución
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="distrito" className={labelClass}>
                                    Distrito
                                </label>

                                <input
                                    id="distrito"
                                    name="distrito"
                                    type="text"
                                    value={form.distrito}
                                    onChange={handleChange}
                                    placeholder="Ej. La Plata"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label htmlFor="provincia" className={labelClass}>
                                    Provincia
                                </label>

                                <input
                                    id="provincia"
                                    name="provincia"
                                    type="text"
                                    value={form.provincia}
                                    onChange={handleChange}
                                    placeholder="Ej. Buenos Aires"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="direccion" className={labelClass}>
                                Dirección
                            </label>

                            <input
                                id="direccion"
                                name="direccion"
                                type="text"
                                value={form.direccion}
                                onChange={handleChange}
                                placeholder="Calle, número y localidad"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </section>

                <div className="mx-5 border-t border-slate-800 sm:mx-7" />

                {/* SECCIÓN: CONTACTO */}
                <section className="p-5 sm:p-7">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                            <Phone size={20} />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Información de contacto
                            </h2>
                            <p className="text-xs text-slate-500">
                                Datos para comunicarse con la institución
                            </p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="telefono" className={labelClass}>
                            Teléfono
                        </label>

                        <input
                            id="telefono"
                            name="telefono"
                            type="tel"
                            value={form.telefono}
                            onChange={handleChange}
                            placeholder="Ej. 221 456-7890"
                            autoComplete="tel"
                            className={inputClass}
                        />
                    </div>
                </section>

                {/* ERROR */}
                {errorMessage && (
                    <div
                        role="alert"
                        className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 sm:mx-7"
                    >
                        <ShieldAlert size={19} className="mt-0.5 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* PIE DEL FORMULARIO */}
                <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-slate-800 bg-slate-950/40 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                    <p className="text-xs text-slate-500">
                        <span className="text-blue-400">*</span>
                        {' '}Campos obligatorios
                    </p>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={mutation.isPending}
                            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition-all hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    {editing ? (
                                        <Save size={17} />
                                    ) : (
                                        <Check size={17} />
                                    )}
                                    {editing
                                        ? 'Guardar cambios'
                                        : 'Crear institución'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            <p className="mt-5 text-center text-xs text-slate-600">
                EduQuest · Administración institucional
            </p>
        </div>
    );
}
