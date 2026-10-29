import { useState } from 'react';
import { useTeacherSubjectDetail } from '../hooks/useTeacherSubject';
import { useCreateUnit } from '../hooks/useUnits';

export default function UnitFormModal({ teacherSubjectId, onClose }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [error, setError] = useState('');

    const { data: detail, isLoading } = useTeacherSubjectDetail(teacherSubjectId);
    const createUnit = useCreateUnit();

    const games = (detail?.activities ?? []).filter((a) => a.status === 'ACTIVE');

    const toggle = (id) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('El título es obligatorio.');
            return;
        }
        setError('');
        createUnit.mutate(
            { teacherSubjectId, title: title.trim(), description: description.trim(), activityIds: selectedIds },
            {
                onSuccess: onClose, // cierra tras el 201
                onError: (err) =>
                    setError(err?.response?.data?.message ?? 'No se pudo guardar la unidad.'),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
                <h3 className="mb-5 text-xl font-bold">Agregar Unidad</h3>

                <label className="mb-1 block text-sm text-slate-300">Título *</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="Ej: Introducción a las Matemáticas"
                />

                <label className="mb-1 block text-sm text-slate-300">Descripción</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
                />

                <p className="mb-2 text-sm text-slate-300">Minijuegos a vincular</p>
                <div className="mb-4 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3">
                    {isLoading && <p className="text-sm text-slate-400">Cargando...</p>}
                    {!isLoading && games.length === 0 && (
                        <p className="text-sm text-slate-500">Esta materia no tiene minijuegos asignados.</p>
                    )}
                    {games.map((game) => (
                        <label key={game.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(game.id)}
                                onChange={() => toggle(game.id)}
                            />
                            {game.title}
                        </label>
                    ))}
                </div>

                {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                        Cerrar
                    </button>
                    <button
                        type="submit"
                        disabled={createUnit.isPending}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                    >
                        {createUnit.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}