import { useState } from 'react';
import { useMyTeacherSubjects } from '../hooks/useTeacherSubject';
import EditSubjectModal from '../components/EditSubjectModal';
import { Link } from 'react-router-dom';

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="w-4 h-4">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
);

export default function TeacherSubjectsView() {
    const { data: rows = [], isLoading, isError } = useMyTeacherSubjects();
    const [selectedId, setSelectedId] = useState(null);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Materias</h2>

            {isLoading && <p className="text-slate-400">Cargando...</p>}
            {isError && <p className="text-red-400">No se pudieron cargar las materias.</p>}

            {!isLoading && !isError && (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="py-3">Nombre</th>
                            <th>Curso</th>
                            <th>Juego</th>
                            <th className="text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const game = row.activities?.[0];
                            const active = Boolean(game);
                            return (
                                <tr key={row.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                                    <td className="py-4">{row.subject.nombre}</td>
                                    <td>{row.course.nombre}</td>
                                    <td>{game ? game.title : 'Sin juego'}</td>
                                    <td className="text-right">
                                        <div className="inline-flex items-center gap-3">
                                            <Link
                                                to={`/dashboard/my-subjects/${row.id}/units`}
                                                className="border border-slate-600 text-slate-300 hover:bg-slate-800 rounded px-3 py-2 text-sm"
                                            >
                                                Unidades
                                            </Link>
                                            <span className={`px-4 py-1.5 rounded border text-sm ${active
                                                ? 'border-emerald-500/60 text-emerald-400 bg-emerald-500/10'
                                                : 'border-slate-600 text-slate-400'}`}>
                                                {active ? 'Activa' : 'Inactiva'}
                                            </span>
                                            <button type="button" onClick={() => setSelectedId(row.id)}
                                                title="Editar materia" aria-label="Editar materia"
                                                className="border border-slate-600 text-slate-300 hover:bg-slate-800 rounded p-2 cursor-pointer">
                                                <PencilIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-500">
                                    No tenés materias asignadas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            <EditSubjectModal teacherSubjectId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
    );
}