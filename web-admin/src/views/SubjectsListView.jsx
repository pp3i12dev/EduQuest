import { useState } from 'react';
import { useSubjectsAdmin, useCreateSubject, useUpdateSubject, useDeleteSubject } from '../hooks/useSubjectAdmin';
import SubjectFormModal from '../components/SubjectFormModal'
import ConfirmDialog from '../components/ConfirmDialog';

export default function SubjectsListView() {
    const { data: subjects, isLoading } = useSubjectsAdmin();
    const createMutation = useCreateSubject();
    const updateMutation = useUpdateSubject();
    const deleteMutation = useDeleteSubject();

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
                <h2 className="text-2xl font-bold">Materias</h2>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
                    + Agregar
                </button>
            </div>

            {isLoading ? <p className="text-slate-400">Cargando...</p> : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="py-2">Nombre</th><th>Docente</th><th>Curso</th><th>Juego</th><th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects?.map((s) => (
                            <tr key={s.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                                <td className="py-3">{s.nombre}</td>
                                <td>{s.teachers?.map((assignment) => `${assignment.teacher.user.firstName} ${assignment.teacher.user.lastName}`).join(', ') || '—'}</td>
                                <td>{s.teachers?.map((assignment) => assignment.course.nombre).join(', ') || '—'}</td>
                                <td>{s.teachers?.map((assignment) => assignment.gameId === 'pig-game' ? 'Pig Game' : assignment.gameId || '—').join(', ') || '—'}</td>
                                <td className="text-right space-x-2">
                                    <button onClick={() => { setEditing(s); setFormOpen(true); }} className="text-blue-400 hover:underline text-xs">Editar</button>
                                    <button onClick={() => setDeletingId(s.id)} className="text-red-400 hover:underline text-xs">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                        {subjects?.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Sin registros.</td></tr>}
                    </tbody>
                </table>
            )}

            <SubjectFormModal open={formOpen} initialData={editing} onSubmit={handleSubmit} onClose={() => setFormOpen(false)}
                isSaving={createMutation.isPending || updateMutation.isPending}
                formError={createMutation.error?.response?.data?.message || updateMutation.error?.response?.data?.message} />

            <ConfirmDialog open={Boolean(deletingId)} title="Eliminar materia" message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar" onCancel={() => setDeletingId(null)}
                onConfirm={() => deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })} />
        </div>
    );
}