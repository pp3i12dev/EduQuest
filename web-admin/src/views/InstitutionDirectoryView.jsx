import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, Mail, Phone, ContactRound, Users, SlidersHorizontal, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { directoryService } from '../services/directory.service';

const selector = 'w-full min-w-0 rounded-xl border border-slate-600/80 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-400';
const ROLE = { DIRECTOR: 'Directivo', PRECEPTOR: 'Preceptor', TEACHER: 'Docente' };
const SHIFT = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };
const initial = { search: '', role: '', careerId: '', courseId: '', subjectId: '', shift: '' };
export default function InstitutionDirectoryView() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(initial);
  const [page, setPage] = useState(1);
  const [institutionId, setInstitutionId] = useState(user?.institutionId ? String(user.institutionId) : (searchParams.get('institutionId') || ''));
  const superAdmin = user?.isSuperAdmin || user?.roles?.includes('SUPER_ADMIN');
  const scope = institutionId ? { institutionId } : {};
  const institutionsQuery = useQuery({ queryKey: ['directory-institutions'], queryFn: directoryService.institutions, enabled: Boolean(superAdmin) });
  const options = useQuery({ queryKey: ['directory-options', institutionId], queryFn: () => directoryService.options(scope), enabled: Boolean(institutionId) });
  const query = useQuery({ queryKey: ['directory', institutionId, filter, page],
    queryFn: () => directoryService.list({ ...scope, ...filter, page }), enabled: Boolean(institutionId) });
  const change = (key, value) => { setFilter(prev => ({ ...prev, [key]: value, ...(key === 'careerId' ? { courseId: '' } : {}) })); setPage(1); };
  const careers = options.data?.careers || [];
  const courses = (options.data?.courses || []).filter(c => !filter.careerId || String(c.careerId) === filter.careerId);
  const subjects = options.data?.subjects || [];
  const total = query.data?.total || 0;
  return <section className="mx-auto max-w-7xl space-y-5 text-slate-100">
    <header className="eq-glass-panel rounded-2xl border border-teal-400/20 bg-gradient-to-r from-[#173b51] to-[#17273e] p-6 shadow-xl">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-300"><ShieldCheck size={15} /> Comunidad educativa</p>
      <h2 className="mt-2 flex items-center gap-3 text-2xl font-bold sm:text-3xl"><ContactRound size={30} /> Directorio institucional</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">Encontrá personal de tu institución. Los datos de contacto se muestran exclusivamente cuando cada persona lo autoriza desde Mi perfil.</p>
    </header>
    {superAdmin && <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm">
      <label className="block font-semibold text-slate-200">Institución que querés consultar
        <select value={institutionId} onChange={e => { setInstitutionId(e.target.value); setFilter(initial); setPage(1); }} className={`${selector} mt-2 max-w-xl`}>
          <option value="">Elegir institución</option>{(institutionsQuery.data || []).map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}
        </select>
      </label>
    </div>}
    <div className="eq-glass-panel rounded-2xl border border-slate-700 bg-[#182b43]/95 p-5 shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 font-semibold"><SlidersHorizontal size={19} className="text-teal-300" /> Buscar contactos</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="relative"><span className="sr-only">Nombre o apellido</span><Search size={18} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input type="search" value={filter.search} onChange={e=>change('search',e.target.value)} placeholder="Nombre o apellido" className={`${selector} pl-10`} /></label>
        <select className={selector} aria-label="Filtrar por rol" value={filter.role} onChange={e=>change('role',e.target.value)}><option value="">Todos los cargos</option>{Object.entries(ROLE).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
        <select className={selector} aria-label="Filtrar por carrera" value={filter.careerId} onChange={e=>change('careerId',e.target.value)}><option value="">Todas las carreras</option>{careers.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}</select>
        <select className={selector} aria-label="Filtrar por curso" value={filter.courseId} onChange={e=>change('courseId',e.target.value)}><option value="">Todos los cursos</option>{courses.map(v=><option key={v.id} value={v.id}>{v.nombre} · {v.academicYear}</option>)}</select>
        <select className={selector} aria-label="Filtrar por materia" value={filter.subjectId} onChange={e=>change('subjectId',e.target.value)}><option value="">Todas las materias</option>{subjects.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}</select>
        <select className={selector} aria-label="Filtrar por turno" value={filter.shift} onChange={e=>change('shift',e.target.value)}><option value="">Todos los turnos</option>{Object.entries(SHIFT).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{total} contacto{total===1?'':'s'} encontrado{total===1?'':'s'}</span>
        <button type="button" onClick={()=>{setFilter(initial);setPage(1);}} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:border-teal-400">Limpiar filtros</button></div>
    </div>
    {options.isError || query.isError ? <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300">{query.error?.response?.data?.message || options.error?.response?.data?.message || 'No se pudo cargar el directorio.'}</p> : null}
    {!institutionId ? <p className="p-5 text-slate-300">Seleccioná una institución para comenzar.</p>
    : query.isLoading ? <p className="p-5 text-slate-300">Cargando contactos…</p>
    : !query.data?.items?.length ? <p className="rounded-xl border border-slate-700 p-6 text-slate-300">No encontramos personal para esos filtros.</p>
    : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.items.map(person=><article key={person.id} className="eq-glass-card min-w-0 rounded-2xl border border-slate-700 bg-[#17283f]/95 p-5 transition hover:border-teal-500/35">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-200"><Users size={23}/></div><div className="min-w-0"><h3 className="break-words font-bold text-white">{person.firstName} {person.lastName}</h3><p className="text-sm text-teal-300">{person.roles.map(x=>ROLE[x]).join(' · ')}</p></div></div>
        {(person.position || person.specialty || person.shift) && <p className="mt-3 text-sm text-slate-300">{[person.position,person.specialty,SHIFT[person.shift]].filter(Boolean).join(' · ')}</p>}
        <div className="mt-5 space-y-2 border-t border-slate-700 pt-4 text-sm">
          {person.email ? <a href={`mailto:${person.email}`} className="flex items-center gap-2 break-all text-sky-300 hover:underline"><Mail size={17}/> {person.email}</a> : <p className="flex items-center gap-2 text-slate-500"><Mail size={16}/> Correo no compartido</p>}
          {person.telefono ? <a href={`tel:${person.telefono.replace(/[^+0-9]/g,'')}`} className="flex items-center gap-2 break-all text-sky-300 hover:underline"><Phone size={17}/> {person.telefono}</a> : <p className="flex items-center gap-2 text-slate-500"><Phone size={16}/> Teléfono no compartido</p>}
        </div>
      </article>)}</div>}
    {total > 20 && <nav aria-label="Paginación del directorio" className="flex items-center justify-center gap-4 py-5">
      <button type="button" disabled={page===1} onClick={()=>setPage(v=>v-1)} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-30"><ChevronLeft size={16}/> Anterior</button>
      <span className="text-sm text-slate-300">Página {page} de {Math.ceil(total/20)}</span>
      <button type="button" disabled={page*20>=total} onClick={()=>setPage(v=>v+1)} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-30">Siguiente <ChevronRight size={16}/></button>
    </nav>}
  </section>;
}
