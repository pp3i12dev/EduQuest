import { useState } from 'react';
import { useCreateUnit } from '../hooks/useUnits';

/** La unidad solo define una parte de la planificación; no vincula juegos. */
export default function UnitFormModal({ teacherSubjectId, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const create = useCreateUnit();
  const submit = event => {
    event.preventDefault();
    if (!title.trim()) { setError('Ingresá el nombre de la unidad didáctica.'); return; }
    create.mutate({ teacherSubjectId, title: title.trim(), description: description.trim() }, {
      onSuccess: onClose,
      onError: err => setError(err.response?.data?.message || 'No se pudo crear la unidad didáctica.'),
    });
  };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !create.isPending) onClose(); }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Nueva unidad didáctica" className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
      <div><h2 className="text-xl font-bold">Nueva unidad didáctica</h2><p className="mt-2 text-sm text-slate-400">Primero organizá el programa. Después agregá temas dentro de la unidad y, en esos temas, vinculá actividades y materiales.</p></div>
      <label className="block text-sm font-semibold">Nombre de la unidad *<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Ej. Capacidades físicas" className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 outline-none focus:border-blue-400"/></label>
      <label className="block text-sm font-semibold">Descripción (opcional)<textarea rows={4} maxLength={1500} value={description} onChange={e => setDescription(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 outline-none focus:border-blue-400" placeholder="Propósitos y contenidos generales" /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-950/60 p-3 text-sm text-rose-200">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} disabled={create.isPending} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm">Cancelar</button><button disabled={create.isPending} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{create.isPending ? 'Guardando...' : 'Crear unidad'}</button></div>
    </form>
  </div>;
}
