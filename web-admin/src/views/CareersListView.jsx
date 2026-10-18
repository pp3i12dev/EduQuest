
import { useContext, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import {
    useCareersAdmin,
    useCreateCareer,
    useUpdateCareer,
    useDeleteCareer,
} from '../hooks/useCareerAdmin';
import { useInstitutions } from '../hooks/useInstitution';

import CareerFormModal from '../components/CareerFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchInput from '../components/SearchInput';

const LEVEL_LABELS = {
    JARDIN: 'Jardín',
    PRIMARIO: 'Primario',
    SECUNDARIO: 'Secundario',
    TERCIARIO: 'Terciario',
    UNIVERSITARIO: 'Universitario',
    POSTGRADO: 'Postgrado',
    CURSO: 'Curso',
    OTRO: 'Otro',
};

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        'Ocurrió un error al realizar la operación.'
    );
}

export default function CareersListView() {
    const { user } = useContext(AuthContext);

    const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

    const { data: careers = [], isLoading, error } =
        useCareersAdmin();

    const { data: institutions = [] } = useInstitutions();

    const createMutation = useCreateCareer();
    const updateMutation = useUpdateCareer();
    const deleteMutation = useDeleteCareer();

    const [search, setSearch] = useState('');
    const [selectedInstitution, setSelectedInstitution] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingCareer, setEditingCareer] = useState(null);
    const [deletingCareer, setDeletingCareer] = useState(null);
    const [formError, setFormError] = useState('');
    const [actionError, setActionError] = useState('');

    const institutionMap = useMemo(
        () => new Map(institutions.map((item) => [item.id, item.nombre])),
        [institutions]
    );

    const filteredCareers = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('es');

        return careers.filter((career) => {
            const matchesInstitution =
                !isSuperAdmin ||
                !selectedInstitution ||
                String(career.institutionId) === selectedInstitution;

            const searchable = [
                career.nombre,
                career.level,
                LEVEL_LABELS[career.level],
                career.institution?.nombre,
                institutionMap.get(career.institutionId),
                career.id,
            ]
                .filter((value) => value != null)
                .join(' ')
                .toLocaleLowerCase('es');

            return matchesInstitution && searchable.includes(term);
        });
    }, [
        careers,
        search,
        selectedInstitution,
        isSuperAdmin,
        institutionMap,
    ]);

    const openCreate = () => {
        setEditingCareer(null);
        setFormError('');
        setFormOpen(true);
    };

    const openEdit = (career) => {
        setEditingCareer(career);
        setFormError('');
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingCareer(null);
        setFormError('');
    };

    const handleSubmit = (payload) => {
        setFormError('');

        const mutation = payload.id
            ? updateMutation
            : createMutation;

        mutation.mutate(payload, {
            onSuccess: closeForm,
            onError: (mutationError) => {
                setFormError(getErrorMessage(mutationError));
            },
        });
    };

    const handleDelete = () => {
        if (!deletingCareer) return;

        setActionError('');

        deleteMutation.mutate(deletingCareer.id, {
            onSuccess: () => setDeletingCareer(null),
            onError: (mutationError) => {
                setActionError(getErrorMessage(mutationError));
                setDeletingCareer(null);
            },
        });
    };

    const buttonClass =
        'inline-flex cursor-pointer items-center justify-center gap-2 ' +
        'rounded-lg px-3 py-2 text-sm font-medium transition-colors';

    return (
        <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-3 text-2xl font-bold">
                        <GraduationCap className="text-blue-400" />
                        Carreras y niveles educativos
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                        Administrá las carreras y los niveles de cada institución.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreate}
                    className={`${buttonClass} bg-blue-600 hover:bg-blue-700`}
                >
                    <Plus size={18} />
                    Nueva carrera / nivel
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar carrera, nivel o institución..."
                />

                {isSuperAdmin && (
                    <select
                        value={selectedInstitution}
                        onChange={(event) =>
                            setSelectedInstitution(event.target.value)
                        }
                        className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm"
                    >
                        <option value="">Todas las instituciones</option>

                        {institutions.map((institution) => (
                            <option key={institution.id} value={institution.id}>
                                {institution.nombre}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {actionError && (
                <p role="alert" className="text-sm text-red-400">
                    {actionError}
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-400">
                    {getErrorMessage(error)}
                </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/90">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                        <tr>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Nivel</th>
                            {isSuperAdmin && (
                                <th className="px-4 py-3">Institución</th>
                            )}
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={isSuperAdmin ? 4 : 3}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Cargando carreras...
                                </td>
                            </tr>
                        ) : filteredCareers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={isSuperAdmin ? 4 : 3}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    No se encontraron carreras.
                                </td>
                            </tr>
                        ) : (
                            filteredCareers.map((career) => (
                                <tr
                                    key={career.id}
                                    className="hover:bg-slate-800/50"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {career.nombre}
                                    </td>

                                    <td className="px-4 py-3">
                                        {LEVEL_LABELS[career.level] ?? career.level}
                                    </td>

                                    {isSuperAdmin && (
                                        <td className="px-4 py-3">
                                            {career.institution?.nombre ||
                                                institutionMap.get(career.institutionId) ||
                                                'Sin información'}
                                        </td>
                                    )}

                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(career)}
                                                title="Editar carrera"
                                                aria-label={`Editar ${career.nombre}`}
                                                className={`${buttonClass} border border-blue-500/50 text-blue-400 hover:bg-blue-500/10`}
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDeletingCareer(career)}
                                                title="Eliminar carrera"
                                                aria-label={`Eliminar ${career.nombre}`}
                                                className={`${buttonClass} border border-red-500/50 text-red-400 hover:bg-red-500/10`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <CareerFormModal
                open={formOpen}
                initialData={editingCareer}
                onSubmit={handleSubmit}
                onClose={closeForm}
                isSaving={
                    createMutation.isPending || updateMutation.isPending
                }
                institutions={institutions}
                isSuperAdmin={isSuperAdmin}
                formError={formError}
            />

            <ConfirmDialog
                open={Boolean(deletingCareer)}
                title="Eliminar carrera"
                message={
                    deletingCareer
                        ? `¿Confirmás eliminar "${deletingCareer.nombre}"? La operación puede estar restringida si tiene cursos asociados.`
                        : ''
                }
                confirmLabel="Eliminar"
                onConfirm={handleDelete}
                onCancel={() => setDeletingCareer(null)}
            />
        </div>
    );
}
