import { useState } from 'react';
import { useCareersAdmin, useCreateCareer, useUpdateCareer, useDeleteCareer } from '../hooks/useCareerAdmin';
import CareerFormModal from '../components/CareerFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CareersListView() {
    const { data: careers, isLoading } = useCareersAdmin();
    const createMutation = useCreateCareer();
    const updateMutation = useUpdateCareer();
    const deleteMutation = useDeleteCareer();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const handleSubmit = (payload) => {
        const action = payload.id ? updateMutation : createMutation;
        action.mutate(payload, { onSuccess: () => setFormOpen(false) });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Carreras / Niveles</h2>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
                    + Agregar
                </button>
            </div>

            {isLoading ? <p className="text-slate-400">Cargando...</p> : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="py-2">Nombre</th><th>Nivel</th><th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {careers?.map((c) => (
                            <tr key={c.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                                <td className="py-3">{c.nombre}</td>
                                <td className="text-cyan-400">{c.level}</td>
                                <td className="text-right space-x-2">
                                    <button onClick={() => { setEditing(c); setFormOpen(true); }} className="text-blue-400 hover:underline text-xs">Editar</button>
                                    <button onClick={() => setDeletingId(c.id)} className="text-red-400 hover:underline text-xs">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                        {careers?.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Sin registros.</td></tr>}
                    </tbody>
                </table>
            )}

            <CareerFormModal open={formOpen} initialData={editing} onSubmit={handleSubmit} onClose={() => setFormOpen(false)}
                isSaving={createMutation.isPending || updateMutation.isPending} />

            <ConfirmDialog open={Boolean(deletingId)} title="Eliminar carrera" message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar" onCancel={() => setDeletingId(null)}
                onConfirm={() => deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })} />
        </div>
    );
}