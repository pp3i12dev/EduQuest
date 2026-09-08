import { useState, useContext } from 'react';
import { useInvitations, useCreateInvitation, useCancelInvitation } from '../hooks/useInvitations';
import { useCareers, useCoursesByCareer } from '../hooks/useAcademic';
import { AuthContext } from '../context/AuthContext';

const ROLE_LABELS = { DIRECTOR: 'Directivo', PRECEPTOR: 'Preceptor', TEACHER: 'Docente', STUDENT: 'Alumno' };

function InviteForm({ onSubmit, onClose, isSaving }) {
    const { user } = useContext(AuthContext);
    const isOnlyTeacher = user?.roles?.length === 1 && user.roles[0] === 'TEACHER';

    const [email, setEmail] = useState('');
    const [role, setRole] = useState(isOnlyTeacher ? 'STUDENT' : 'TEACHER');
    const [careerId, setCareerId] = useState('');
    const [courseId, setCourseId] = useState('');

    const { data: careers } = useCareers(user?.institutionId);
    const { data: courses } = useCoursesByCareer(careerId);

    const availableRoles = isOnlyTeacher ? ['STUDENT'] : ['DIRECTOR', 'PRECEPTOR', 'TEACHER', 'STUDENT'];

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            email,
            role,
            ...(role === 'STUDENT' && isOnlyTeacher ? { courseId } : {}),
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4"
        >
            <h3 className="text-lg font-semibold">Nueva invitación</h3>

            <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
            >
                {availableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
            </select>

            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email del invitado"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
            />

            {role === 'STUDENT' && isOnlyTeacher && (
                <>
                    <select
                        value={careerId}
                        onChange={(e) => { setCareerId(e.target.value); setCourseId(''); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    >
                        <option value="">Elegí carrera/nivel</option>
                        {careers?.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre} ({c.level})</option>
                        ))}
                    </select>
                    <select
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        disabled={!careerId}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm disabled:opacity-50"
                    >
                        <option value="">Elegí uno de tus cursos</option>
                        {courses?.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </>
            )}

            <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800">
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                    {isSaving ? 'Enviando...' : 'Enviar invitación'}
                </button>
            </div>
        </form>
    );
}

export default function InvitationsListView() {
    const { data: invitations, isLoading } = useInvitations();
    const cancelMutation = useCancelInvitation();
    const createMutation = useCreateInvitation();
    const [formOpen, setFormOpen] = useState(false);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Invitaciones</h2>
                <button
                    onClick={() => setFormOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-medium"
                >
                    + Invitar
                </button>
            </div>

            {isLoading ? (
                <p className="text-slate-400">Cargando...</p>
            ) : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="py-2">Email</th>
                            <th>Rol</th>
                            <th>Expira</th>
                            <th>Estado</th>
                            <th className="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations?.map((inv) => (
                            <tr key={inv.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                                <td className="py-3">{inv.email}</td>
                                <td className="text-xs text-purple-400">{ROLE_LABELS[inv.role]}</td>
                                <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                                <td>
                                    <span
                                        className={`px-2 py-1 rounded text-xs ${inv.isUsed ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600/20 text-emerald-400'
                                            }`}
                                    >
                                        {inv.isUsed ? 'Usada' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="text-right">
                                    {!inv.isUsed && (
                                        <button
                                            onClick={() => cancelMutation.mutate(inv.id)}
                                            className="text-red-400 hover:underline text-xs"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {invitations?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-500">
                                    Sin invitaciones.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {formOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <InviteForm
                        isSaving={createMutation.isPending}
                        onClose={() => setFormOpen(false)}
                        onSubmit={(payload) => createMutation.mutate(payload, { onSuccess: () => setFormOpen(false) })}
                    />
                </div>
            )}
        </div>
    );
}