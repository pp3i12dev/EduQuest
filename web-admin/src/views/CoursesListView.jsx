import { useState } from 'react';
import { useCoursesAdmin, useCreateCourse, useUpdateCourse, useDeleteCourse } from '../hooks/useCourseAdmin';
import CourseFormModal from '../components/CourseFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CoursesListView() {
    const { data: courses, isLoading } = useCoursesAdmin();
    const createMutation = useCreateCourse();
    const updateMutation = useUpdateCourse();
    const deleteMutation = useDeleteCourse();

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
                <h2 className="text-2xl font-bold">Cursos</h2>
                <button onClick={() => { setEditing(null); setFormOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
                    + Agregar
                </button>
            </div>

            {isLoading ? <p className="text-slate-400">Cargando...</p> : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="py-2">Nombre</th><th>Año</th><th>Carrera/Nivel</th><th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses?.map((c) => (
                            <tr key={c.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                                <td className="py-3">{c.nombre}</td>
                                <td>{c.academicYear}</td>
                                <td className="text-cyan-400 text-xs">{c.career?.nombre ?? '—'}</td>
                                <td className="text-right space-x-2">
                                    <button onClick={() => { setEditing(c); setFormOpen(true); }} className="text-blue-400 hover:underline text-xs">Editar</button>
                                    <button onClick={() => setDeletingId(c.id)} className="text-red-400 hover:underline text-xs">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                        {courses?.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Sin registros.</td></tr>}
                    </tbody>
                </table>
            )}

            <CourseFormModal open={formOpen} initialData={editing} onSubmit={handleSubmit} onClose={() => setFormOpen(false)}
                isSaving={createMutation.isPending || updateMutation.isPending} />

            <ConfirmDialog open={Boolean(deletingId)} title="Eliminar curso" message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar" onCancel={() => setDeletingId(null)}
                onConfirm={() => deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })} />
        </div>
    );
}