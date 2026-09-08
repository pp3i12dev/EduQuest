import { useState, useEffect } from 'react';

export default function SubjectFormModal({ open, initialData, onSubmit, onClose, isSaving }) {
    const [nombre, setNombre] = useState('');

    useEffect(() => {
        setNombre(initialData?.nombre ?? '');
    }, [initialData, open]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(initialData ? { id: initialData.id, nombre } : { nombre });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="text-lg font-semibold">{initialData ? 'Editar' : 'Nueva'} materia</h3>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej: Matemática)" required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}