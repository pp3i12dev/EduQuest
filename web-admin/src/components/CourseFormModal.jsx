import { useState, useEffect } from 'react';
import { useCareersAdmin } from '../hooks/useCareerAdmin';

export default function CourseFormModal({ open, initialData, onSubmit, onClose, isSaving }) {
    const { data: careers } = useCareersAdmin();
    const [form, setForm] = useState({ nombre: '', academicYear: new Date().getFullYear(), careerId: '' });

    useEffect(() => {
        setForm(
            initialData
                ? { nombre: initialData.nombre, academicYear: initialData.academicYear, careerId: initialData.careerId ?? '' }
                : { nombre: '', academicYear: new Date().getFullYear(), careerId: '' }
        );
    }, [initialData, open]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(initialData ? { id: initialData.id, ...form } : form);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="text-lg font-semibold">{initialData ? 'Editar' : 'Nuevo'} curso</h3>
                <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Nombre (ej: 5to A)" required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <input type="number" value={form.academicYear} onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                    placeholder="Año lectivo"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <select value={form.careerId} onChange={(e) => setForm((f) => ({ ...f, careerId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                    <option value="">Sin carrera/nivel</option>
                    {careers?.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.level})</option>)}
                </select>
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