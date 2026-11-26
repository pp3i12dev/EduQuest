import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Search, ShieldCheck, XCircle } from 'lucide-react';
import { usersService } from '../services/users.service';

const labels = { DIRECTOR: 'Directivo', PRECEPTOR: 'Preceptor', TEACHER: 'Docente' };
const normal = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const fieldClass = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white';
export default function StaffSignupRequestsView() {
  const client = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [role, setRole] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['staff-signup-requests', status],
    queryFn: () => usersService.staffSignupRequests(status), refetchInterval: status === 'PENDING' ? 45000 : false });
  const rows = Array.isArray(query.data) ? query.data : [];
  const institutions = useMemo(() => [...new Map(rows.map(u => [String(u.institutionId), u.institution?.nombre || `Institución ${u.institutionId}`]))].sort((a,b)=>a[1].localeCompare(b[1],'es')), [rows]);
  const shown = useMemo(() => rows.filter(u =>
    (!institutionId || String(u.institutionId) === institutionId) &&
    (!role || u.requestedRole === role) &&
    normal(`${u.firstName} ${u.lastName} ${u.dni} ${u.email} ${u.institution?.nombre}`).includes(normal(search.trim()))
  ), [rows, institutionId, role, search]);
  const review = useMutation({ mutationFn: payload => usersService.reviewStaffSignup(payload),
    onSuccess: data => { setNotice(data.message); setConfirm(null); setReason('');
      client.invalidateQueries({ queryKey: ['staff-signup-requests'] });
      client.invalidateQueries({ queryKey: ['users'] });
      client.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } });
  const approve = decision => { if (!confirm) return; if (decision === 'REJECTED' && reason.trim().length < 5) return;
    review.mutate({ id: confirm.id, decision, reason: reason.trim() }); };
  return <section className="mx-auto max-w-7xl space-y-5 pb-12 text-white">
    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-sky-300 hover:underline"><ArrowLeft size={17}/> Panel principal</Link>
    <div className="eq-glass-panel rounded-2xl border border-slate-700 bg-slate-900/90 p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck size={22}/> Solicitudes de personal</h2>
      <p className="mt-2 text-sm text-slate-300">Solo aparecen solicitudes con correo verificado. Los permisos de aprobación dependen del rol solicitado y de la institución.</p>
      <div className="mt-5 flex flex-wrap gap-2">{[
        ['PENDING','Pendientes'], ['APPROVED','Aprobadas'], ['REJECTED','Rechazadas']
      ].map(([v,t])=><button key={v} type="button" onClick={()=>{setStatus(v);setConfirm(null);setNotice('');}}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${status===v?'bg-teal-600':'border border-slate-600 bg-slate-800'}`}>{t}</button>)}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400"/>
          <input className={`${fieldClass} pl-9`} type="search" aria-label="Buscar personal" placeholder="Nombre, DNI o correo" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <select className={fieldClass} aria-label="Filtrar institución" value={institutionId} onChange={e=>setInstitutionId(e.target.value)}>
          <option value="">Todas las instituciones</option>{institutions.map(([id,n])=><option key={id} value={id}>{n}</option>)}
        </select>
        <select className={fieldClass} aria-label="Filtrar rol" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">Todos los roles</option>{Object.entries(labels).map(([k,n])=><option key={k} value={k}>{n}</option>)}
        </select>
        <button type="button" onClick={()=>{setSearch('');setInstitutionId('');setRole('');}} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Limpiar filtros</button>
      </div>
      <p className="mt-3 text-xs text-slate-400">Mostrando {shown.length} de {rows.length} solicitudes visibles según tus permisos.</p>
      {notice && <p role="status" className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-sm text-teal-100">{notice}</p>}
      {query.error && <p role="alert" className="mt-4 text-sm text-red-300">{query.error.response?.data?.message || 'No se pudieron cargar las solicitudes.'}</p>}
      {query.isLoading ? <p className="py-8 text-slate-400">Cargando…</p> : shown.length === 0 ? <p className="py-8 text-slate-400">No hay solicitudes para los filtros elegidos.</p> :
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{shown.map(u=><article key={u.id} className="eq-glass-card rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{u.firstName} {u.lastName}</h3>
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs text-teal-200">{labels[u.requestedRole]}</span></div>
        <p className="mt-2 break-all text-sm text-slate-300">{u.email} · DNI {u.dni}</p>
        <p className="mt-1 text-sm text-slate-400">{u.institution?.nombre}</p>
        {u.signupReviewReason && <p className="mt-2 text-sm text-amber-200">Motivo: {u.signupReviewReason}</p>}
        {status==='PENDING' && <button onClick={()=>{setConfirm(u);setReason('');review.reset();}} className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold hover:bg-teal-500">Revisar solicitud</button>}
      </article>)}</div>}
    </div>
    {confirm && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"><div role="dialog" aria-modal="true" aria-labelledby="staff-review-title" className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-600 bg-slate-900 p-6">
      <h3 id="staff-review-title" className="text-xl font-bold">Revisar alta de personal</h3>
      <p className="text-sm text-slate-300">{confirm.firstName} {confirm.lastName}, {labels[confirm.requestedRole]} de {confirm.institution?.nombre}. Aprobar creará su perfil con un legajo interno provisional y le habilitará el ingreso. Podrás editar el legajo desde Gestión de usuarios.</p>
      <label className="block text-sm text-slate-200">Motivo de rechazo (obligatorio para rechazar)
        <textarea className={`${fieldClass} mt-1`} rows={3} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      {review.error && <p role="alert" className="text-sm text-red-300">{review.error.response?.data?.message || review.error.message}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button disabled={review.isPending} onClick={()=>setConfirm(null)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Cancelar</button>
        <button disabled={review.isPending || reason.trim().length < 5} onClick={()=>approve('REJECTED')} className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-200 disabled:opacity-40"><XCircle size={16}/> Rechazar</button>
        <button disabled={review.isPending} onClick={()=>approve('APPROVED')} className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold disabled:opacity-40"><CheckCircle2 size={16}/> Aprobar</button>
      </div>
    </div></div>}
  </section>;
}
