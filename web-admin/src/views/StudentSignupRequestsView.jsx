import { shiftLabel } from '../utils/courseShift';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, BookOpen, Building2, CheckCheck, ChevronRight,
  ClipboardCheck, GraduationCap, Search, ShieldCheck, XCircle,
} from 'lucide-react';
import { usersService } from '../services/users.service';

const tabs = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
];
const normalized = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const formatted = value => value ? new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires',
}).format(new Date(value)) : '—';
const panel = 'rounded-2xl border border-slate-700 bg-slate-900/90 p-4 sm:p-5';

/** Los grupos se obtienen del backend y están filtrados por la institución del usuario. */
export default function StudentSignupRequestsView() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('PENDING');
  const [institutionId, setInstitutionId] = useState('');
  const [careerKey, setCareerKey] = useState('');
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const groupsQuery = useQuery({
    queryKey: ['student-signup-course-groups', tab],
    queryFn: () => usersService.signupCourseGroups(tab),
    refetchInterval: tab === 'PENDING' ? 45000 : false,
  });
  const groups = Array.isArray(groupsQuery.data) ? groupsQuery.data : [];
  const institutions = useMemo(() => {
    const map = new Map();
    groups.forEach(c => map.set(String(c.institutionId), c.institution));
    return [...map.entries()].map(([id, institution]) => ({ id, nombre: institution?.nombre ?? `Institución ${id}` }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [groups]);
  const effectiveInstitution = institutionId || (institutions.length === 1 ? institutions[0].id : '');
  const institutionCourses = groups.filter(c => String(c.institutionId) === effectiveInstitution);
  const careers = useMemo(() => {
    const map = new Map();
    institutionCourses.forEach(c => {
      const key = c.career ? String(c.career.id) : 'sin-carrera';
      map.set(key, c.career?.nombre || 'Sin carrera / nivel asignado');
    });
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [institutionCourses]);
  const effectiveCareer = careerKey || (careers.length === 1 ? careers[0].id : '');
  const visibleCourses = institutionCourses.filter(c => (c.career ? String(c.career.id) : 'sin-carrera') === effectiveCareer);
  const activeCourse = visibleCourses.find(c => String(c.id) === courseId);

  const rowsQuery = useQuery({
    queryKey: ['student-signup-requests', tab, courseId],
    queryFn: () => usersService.signupRequests(tab, Number(courseId)),
    enabled: Boolean(activeCourse),
    refetchInterval: activeCourse && tab === 'PENDING' ? 45000 : false,
  });
  const records = Array.isArray(rowsQuery.data) ? rowsQuery.data : [];
  const rows = useMemo(() => records.filter(u => normalized(
    `${u.firstName} ${u.lastName} ${u.dni} ${u.email}`,
  ).includes(normalized(search.trim()))), [records, search]);
  const allowed = rows.slice(0, 100);
  const selectedVisible = allowed.filter(u => selected.includes(u.id)).map(u => u.id);
  const allVisible = allowed.length > 0 && allowed.every(u => selected.includes(u.id));

  useEffect(() => { setInstitutionId(''); setCareerKey(''); setCourseId(''); setSelected([]); setSearch(''); setNotice(''); }, [tab]);
  useEffect(() => { setSelected([]); setSearch(''); setAction(null); }, [courseId]);

  const bulk = useMutation({
    mutationFn: ({ ids, decision, reason: why }) => decision === 'APPROVED'
      ? usersService.approveSignups(ids) : usersService.rejectSignups(ids, why),
    onSuccess: response => {
      setNotice(`${response.processed} solicitud(es) ${response.status === 'APPROVED' ? 'aprobadas' : 'rechazadas'}.`);
      setAction(null); setSelected([]); setReason('');
      qc.invalidateQueries({ queryKey: ['student-signup-requests'] });
      qc.invalidateQueries({ queryKey: ['student-signup-course-groups'] });
      qc.invalidateQueries({ queryKey: ['users', 'student'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
  const begin = (decision, ids) => {
    if (!activeCourse || !ids.length || ids.length > 100) return;
    bulk.reset(); setReason(''); setNotice(''); setAction({ decision, ids });
  };
  const submit = () => {
    if (!action || bulk.isPending) return;
    if (action.decision === 'REJECTED' && (reason.trim().length < 5 || reason.length > 500)) return;
    bulk.mutate({ ids: action.ids, decision: action.decision, reason: reason.trim() });
  };

  return <section className="mx-auto w-full max-w-7xl space-y-5 pb-12 text-white">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link to="/dashboard/students" className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 hover:underline"><ArrowLeft size={17}/> Volver a Alumnos</Link>
      </div>
      <span className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200"><ShieldCheck size={17}/> Dirección y preceptoría</span>
    </header>

    <div className={panel}>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado de solicitudes">
        {tabs.map(t => <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.value ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{t.label}</button>)}
      </div>
      {groupsQuery.isLoading ? <p className="py-8 text-slate-300">Cargando instituciones y cursos…</p>
        : groupsQuery.error ? <p role="alert" className="mt-5 text-rose-300">No se pudieron cargar los cursos: {groupsQuery.error.response?.data?.message || groupsQuery.error.message}</p>
        : groups.length === 0 ? <p className="py-8 text-slate-300">Todavía no hay cursos registrados.</p>
        : <div className="mt-5 space-y-5">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300" aria-label="Ubicación dentro de las solicitudes">
            <button type="button" onClick={() => { setInstitutionId(''); setCareerKey(''); setCourseId(''); }} className="text-sky-300 hover:underline">Instituciones</button>
            {effectiveInstitution && <><ChevronRight size={15}/><button type="button" onClick={() => { setCareerKey(''); setCourseId(''); }} className="text-sky-300 hover:underline">{institutions.find(i => i.id === effectiveInstitution)?.nombre}</button></>}
            {effectiveCareer && <><ChevronRight size={15}/><button type="button" className="text-sky-300 hover:underline" onClick={() => setCourseId('')}>{careers.find(c => c.id === effectiveCareer)?.nombre}</button></>}
            {activeCourse && <><ChevronRight size={15}/><span className="font-semibold text-white">{activeCourse.nombre} · {shiftLabel(activeCourse.shift)}</span></>}
          </nav>
          {institutions.length > 1 && <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Building2 size={19}/> 1. Seleccioná una institución</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{institutions.map(i => <button key={i.id} type="button" onClick={() => { setInstitutionId(i.id); setCareerKey(''); setCourseId(''); }}
              className={`rounded-xl border p-4 text-left transition ${effectiveInstitution === i.id ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-950 hover:border-sky-600'}`}><span className="font-semibold">{i.nombre}</span><span className="mt-1 block text-xs text-slate-400">{groups.filter(c => String(c.institutionId) === i.id).reduce((n, c) => n + c.requestCount, 0)} solicitudes</span></button>)}</div>
          </div>}
          {effectiveInstitution && <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><GraduationCap size={19}/> {institutions.length > 1 ? '2.' : '1.'} Seleccioná la carrera o nivel</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{careers.map(c => <button key={c.id} type="button" onClick={() => { setCareerKey(c.id); setCourseId(''); }}
              className={`rounded-xl border p-4 text-left transition ${effectiveCareer === c.id ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-950 hover:border-sky-600'}`}><span className="font-semibold">{c.nombre}</span><span className="mt-1 block text-xs text-slate-400">{institutionCourses.filter(x => (x.career ? String(x.career.id) : 'sin-carrera') === c.id).length} curso(s)</span></button>)}</div>
          </div>}
          {effectiveCareer && <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><BookOpen size={19}/> {institutions.length > 1 ? '3.' : '2.'} Elegí el curso para revisar las solicitudes</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleCourses.map(c => <button key={c.id} type="button" onClick={() => setCourseId(String(c.id))}
              className={`rounded-xl border p-4 text-left transition ${courseId === String(c.id) ? 'border-blue-400 bg-blue-500/15' : 'border-slate-700 bg-slate-950 hover:border-blue-500/60'}`}>
              <span className="flex items-center justify-between gap-2"><span className="font-semibold">{c.nombre} · {shiftLabel(c.shift)}</span><span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-200">{c.requestCount}</span></span>
              <span className="mt-2 block text-xs text-slate-400">Ciclo lectivo {c.academicYear} · {c.enrolledCount} matriculados en total</span>
            </button>)}</div>
          </div>}
        </div>}
    </div>

    {activeCourse && <div className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">{activeCourse.nombre} · {shiftLabel(activeCourse.shift)} · {activeCourse.career?.nombre || 'Sin carrera'}</h2><p className="mt-1 text-sm text-slate-400">{activeCourse.institution?.nombre} · {tab.toLowerCase()} · {rows.length} alumno(s)</p></div>
        <button onClick={() => setCourseId('')} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"><ArrowLeft size={16}/> Cambiar curso</button>
      </div>
      <div className="mt-4"><label className="relative block max-w-lg"><Search size={18} className="absolute left-3 top-3 text-slate-400"/><span className="sr-only">Buscar alumno</span>
        <input value={search} onChange={e => { setSearch(e.target.value); setSelected([]); }} placeholder="Buscar nombre, DNI o correo" className="w-full rounded-xl border border-slate-600 bg-slate-950 px-10 py-2.5 text-sm focus:border-sky-400"/></label></div>
      {tab === 'PENDING' && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!allowed.length} checked={allVisible} onChange={e => setSelected(e.target.checked ? allowed.map(u => u.id) : [])} className="h-4 w-4 accent-blue-500"/> Seleccionar todos los alumnos visibles {rows.length > 100 ? '(primeros 100)' : ''}</label>
        <div className="flex flex-wrap gap-2">
          <button disabled={!selectedVisible.length || bulk.isPending} onClick={() => begin('APPROVED', selectedVisible)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold disabled:opacity-40"><CheckCheck size={17}/> Aprobar ({selectedVisible.length})</button>
          <button disabled={!selectedVisible.length || bulk.isPending} onClick={() => begin('REJECTED', selectedVisible)} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-200 disabled:opacity-40"><XCircle size={17}/> Rechazar ({selectedVisible.length})</button>
        </div>
      </div>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
      {rowsQuery.error && <p role="alert" className="mt-4 text-sm text-rose-300">{rowsQuery.error.response?.data?.message || rowsQuery.error.message}</p>}
      {rowsQuery.isLoading ? <p className="py-8 text-slate-400">Cargando alumnos…</p> : rows.length === 0 ? <p className="py-8 text-slate-400">No hay alumnos en este curso para el estado seleccionado.</p> :
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{rows.map(u => <article key={u.id} className={`rounded-xl border p-4 ${selected.includes(u.id) ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-950/65'}`}>
          <div className="flex items-start gap-3">
            {tab === 'PENDING' && <input aria-label={`Seleccionar ${u.firstName} ${u.lastName}`} type="checkbox" disabled={!allowed.some(r => r.id === u.id)} checked={selected.includes(u.id)} onChange={e => setSelected(old => e.target.checked ? [...old, u.id] : old.filter(id => id !== u.id))} className="mt-1 h-4 w-4 accent-blue-500"/>}
            <div className="min-w-0 flex-1"><h3 className="font-semibold">{u.firstName} {u.lastName}</h3><p className="mt-1 break-words text-sm text-slate-300">DNI {u.dni} · {u.email}</p><p className="mt-1 text-xs text-slate-400">Registrado: {formatted(u.createdAt)}</p>
              {u.signupReviewedAt && <p className="mt-1 text-xs text-slate-400">Revisado: {formatted(u.signupReviewedAt)}</p>}{u.signupReviewReason && <p className="mt-2 text-sm text-amber-200">Motivo: {u.signupReviewReason}</p>}
            </div>
          </div>
          {tab === 'PENDING' && <div className="mt-4 flex gap-2 border-t border-slate-700 pt-3"><button onClick={() => begin('APPROVED', [u.id])} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold">Aprobar</button><button onClick={() => begin('REJECTED', [u.id])} className="rounded-lg border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-200">Rechazar</button></div>}
        </article>)}</div>}
    </div>}

    {action && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="signup-modal-title" className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
      <h2 id="signup-modal-title" className="text-xl font-bold">{action.decision === 'APPROVED' ? 'Confirmar aprobación' : 'Confirmar rechazo'}</h2>
      <p className="mt-3 text-sm text-slate-300">{action.ids.length} solicitud(es) de {activeCourse?.nombre} · {shiftLabel(activeCourse?.shift)} serán {action.decision === 'APPROVED' ? 'aprobadas' : 'rechazadas'}. La operación se realiza en un único lote.</p>
      {action.decision === 'REJECTED' && <label className="mt-4 block text-sm font-semibold">Motivo del rechazo (obligatorio)<textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={500} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 p-3" placeholder="Motivo para el alumno"/></label>}
      {bulk.error && <p role="alert" className="mt-3 text-sm text-rose-300">{bulk.error.response?.data?.message || bulk.error.message}</p>}
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => { setAction(null); bulk.reset(); }} disabled={bulk.isPending} className="rounded-xl border border-slate-600 px-4 py-2.5">Cancelar</button><button onClick={submit} disabled={bulk.isPending || (action.decision === 'REJECTED' && reason.trim().length < 5)} className={`rounded-xl px-4 py-2.5 font-semibold disabled:opacity-40 ${action.decision === 'APPROVED' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{bulk.isPending ? 'Procesando…' : `Confirmar ${action.ids.length}`}</button></div>
    </div></div>}
  </section>;
}
