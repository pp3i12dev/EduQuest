import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUnits } from '../hooks/useUnits';
import { useTeacherSubjectDetail } from '../hooks/useTeacherSubject';
import UnitFormModal from '../components/UnitFormModal';

export default function UnitsView() {
    const teacherSubjectId = Number(useParams().teacherSubjectId);
    const { data: units = [], isLoading, isError } = useUnits(teacherSubjectId);
    const { data: detail } = useTeacherSubjectDetail(teacherSubjectId);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Unidades Educativas</h2>
                    {detail && (
                        <p className="text-sm text-slate-400">
                            {detail.subject.nombre} · {detail.course.nombre}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                    + Agregar Unidad
                </button>
            </div>

            {isLoading && <p className="text-slate-400">Cargando...</p>}
            {isError && <p className="text-red-400">No se pudieron cargar las unidades.</p>}

            {!isLoading && !isError && (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 text-left text-slate-400">
                                <th className="px-6 py-4">Título de la Unidad</th>
                                <th className="px-6 py-4">Descripción</th>
                                <th className="px-6 py-4">Contenidos Vinculados</th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.map((unit) => {
                                const count = unit.activities.length;
                                return (
                                    <tr key={unit.id} className="border-b border-slate-800 last:border-0">
                                        <td className="px-6 py-4 font-semibold">{unit.title}</td>
                                        <td className="px-6 py-4 text-slate-400">{unit.description}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                                                {count} {count === 1 ? 'Minijuego' : 'Minijuegos'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {units.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                                        Todavía no hay unidades.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <UnitFormModal teacherSubjectId={teacherSubjectId} onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
}