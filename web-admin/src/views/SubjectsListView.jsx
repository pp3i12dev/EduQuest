import { useContext, useState } from 'react';
import { useSubjectsAdmin, useCreateSubject, useUpdateSubject, useToggleSubjectStatus, useDeleteSubject } from '../hooks/useSubjectAdmin';
import { useCareersAdmin } from '../hooks/useCareerAdmin';
import { AuthContext } from '../context/AuthContext';
import { hasAny } from '../config/permissions';
import SubjectFormModal from '../components/SubjectFormModal'
import ConfirmDialog from '../components/ConfirmDialog';

const GAME_NAMES = { 'pig-game': 'Pig Game' };

const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
        <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </svg>
);

const CapIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-cyan-400">
        <path d="M22 10 12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
);

export default function SubjectsListView() {
    const { user } = useContext(AuthContext);
    const canManage = hasAny(user?.roles, 'subject:manage');

    const { data: subjects, isLoading } = useSubjectsAdmin();
    const { data: careers = [] } = useCareersAdmin();
    const createMutation = useCreateSubject();
    const updateMutation = useUpdateSubject();
    const statusMutation = useToggleSubjectStatus();
    const deleteMutation = useDeleteSubject();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [careerId, setCareerId] = useState('');

    const handleSubmit = (payload) => {
        const action = payload.id ? updateMutation : createMutation;
        action.mutate(payload, { onSuccess: () => setFormOpen(false) });
    };

    const filteredSubjects = careerId
        ? subjects?.filter((s) => s.teachers?.some((assignment) => assignment.course.careerId === Number(careerId)))
        : subjects;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Materias</h2>
                {canManage && (
                    <button onClick={() => { setEditing(null); setFormOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
                        + Agregar
                    </button>
                )}
            </div>

            <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-6">
                <div className="relative max-w-xl mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><CapIcon /></span>
                    <select value={careerId} onChange={(e) => setCareerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-11 pr-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500">
                        <option value="">Todas las carreras</option>
                        {careers.map((career) => <option key={career.id} value={career.id}>{career.nombre}</option>)}
                    </select>
                </div>

                {isLoading ? <p className="text-slate-400">Cargando...</p> : (
                    <div className="space-y-3">
                        {filteredSubjects?.map((s) => {
                            const teacherNames = s.teachers?.map((a) => `${a.teacher.user.firstName} ${a.teacher.user.lastName}`).join(', ') || '—';
                            const courseNames = s.teachers?.map((a) => a.course.nombre).join(', ') || '—';
                            const gameNames = s.teachers?.map((a) => GAME_NAMES[a.gameId] ?? a.gameId ?? '—').join(', ') || '—';

                            return (
                                <div key={s.id}
                                    className={`flex flex-col md:flex-row md:items-center gap-4 border border-slate-800 bg-slate-900/60 rounded-xl p-4 ${s.isActive ? '' : 'opacity-70'}`}>
                                    <div className={`flex items-center justify-center w-14 h-14 shrink-0 rounded-xl ${s.isActive ? 'bg-blue-900/60 text-blue-300' : 'bg-slate-800 text-slate-500'}`}>
                                        <BookIcon />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-lg font-semibold">{s.nombre}</h3>
                                            {s.isActive ? (
                                                <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium border border-green-700 bg-green-900/40 text-green-300">
                                                    <span className="w-2 h-2 rounded-full bg-green-400" /> Activa
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium border border-slate-600 bg-slate-800 text-slate-300">
                                                    <span className="w-2 h-2 rounded-full bg-slate-400" /> Desactivada
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 mt-1 truncate">
                                            {teacherNames} <span className="text-slate-600 mx-2">|</span>
                                            {courseNames} <span className="text-slate-600 mx-2">|</span>
                                            {gameNames}
                                        </p>
                                    </div>

                                    {canManage && (
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => { setEditing(s); setFormOpen(true); }}
                                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-700 hover:bg-blue-600 border border-blue-500/50">
                                                Editar
                                            </button>
                                            <button onClick={() => statusMutation.mutate({ id: s.id, isActive: !s.isActive })}
                                                disabled={statusMutation.isPending}
                                                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-50">
                                                {s.isActive ? 'Desactivar' : 'Activar'}
                                            </button>
                                            <button onClick={() => setDeletingId(s.id)}
                                                className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500 hover:bg-red-500/10">
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredSubjects?.length === 0 && <p className="py-6 text-center text-slate-500">Sin registros.</p>}
                    </div>
                )}

                {(statusMutation.error || deleteMutation.error) && (
                    <p role="alert" className="mt-4 text-sm text-red-400">
                        {statusMutation.error?.response?.data?.message || deleteMutation.error?.response?.data?.message || 'Ocurrió un error'}
                    </p>
                )}
            </div>

            <SubjectFormModal open={formOpen} initialData={editing} onSubmit={handleSubmit} onClose={() => setFormOpen(false)}
                isSaving={createMutation.isPending || updateMutation.isPending}
                formError={createMutation.error?.response?.data?.message || updateMutation.error?.response?.data?.message} />

            <ConfirmDialog open={Boolean(deletingId)} title="Eliminar materia" message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar" onCancel={() => setDeletingId(null)}
                onConfirm={() => deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })} />
        </div>
    );
}
