import { useState, useEffect } from 'react';
import { useMyInstitution, useUpdateInstitution } from '../hooks/useInstitution';

export default function InstitutionView() {
    const { data: institution, isLoading } = useMyInstitution();
    const updateMutation = useUpdateInstitution();

    const [form, setForm] = useState({ nombre: '', distrito: '', provincia: '', direccion: '', telefono: '' });

    useEffect(() => {
        if (institution) {
            setForm({
                nombre: institution.nombre ?? '',
                distrito: institution.distrito ?? '',
                provincia: institution.provincia ?? '',
                direccion: institution.direccion ?? '',
                telefono: institution.telefono ?? '',
            });
        }
    }, [institution]);

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(form);
    };

    if (isLoading) return <p className="text-slate-400">Cargando...</p>;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Institución</h2>
            <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                <p className="text-xs text-slate-500">CUE: {institution?.cue} (no editable)</p>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <input name="distrito" value={form.distrito} onChange={handleChange} placeholder="Distrito"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <input name="provincia" value={form.provincia} onChange={handleChange} placeholder="Provincia"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                <button type="submit" disabled={updateMutation.isPending}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
}