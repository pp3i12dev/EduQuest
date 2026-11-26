import { useContext, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, Mail, Phone, ContactRound, Users, SlidersHorizontal, ShieldCheck, ChevronLeft, ChevronRight, Copy, Check, GraduationCap, BookOpen, School } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { directoryService } from '../services/directory.service';

const selector = 'w-full min-w-0 rounded-xl border border-slate-600/80 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-400';
const ROLE = { DIRECTOR: 'Directivo', PRECEPTOR: 'Preceptor', TEACHER: 'Docente' };
const SHIFT = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };
const initial = { search: '', role: '', careerId: '', courseId: '', subjectId: '', shift: '' };


// Agrupamos por carrera Y curso para conservar la asociación real de cada
// materia; mostrar tres listas sueltas atribuiría materias a cursos erróneos.
function groupAcademicAssignments(assignments = []) {
  const grouped = new Map();
  for (const item of assignments) {
    if (!item?.courseId || !item?.subjectId) continue;
    const key = `${item.careerId ?? 'sin-carrera'}:${item.courseId}`;
    if (!grouped.has(key)) {
      grouped.set(key, { key, careerName: item.careerName, courseName: item.courseName,
        academicYear: item.academicYear, shift: item.shift, subjects: new Map() });
    }
    grouped.get(key).subjects.set(item.subjectId, item.subjectName);
  }
  return Array.from(grouped.values()).map(entry => ({ ...entry,
    subjects: Array.from(entry.subjects.values()).sort((a, b) => a.localeCompare(b, 'es')),
  })).sort((a, b) => String(a.careerName || '').localeCompare(String(b.careerName || ''), 'es') ||
    String(a.courseName || '').localeCompare(String(b.courseName || ''), 'es'));
}

function TeacherAcademicInfo({ assignments }) {
  const groups = groupAcademicAssignments(assignments);
  return <div className="mt-4 border-t border-slate-700/80 pt-4">
    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-200"><GraduationCap size={17} /> Asignaciones docentes</p>
    {!groups.length ? <p className="text-xs text-slate-400">Sin cursos o materias asignadas actualmente.</p>
      : <div className="max-h-72 space-y-2 overflow-y-auto pr-1" aria-label="Carreras, cursos y materias del docente">
        {groups.map(group => <div key={group.key} className="rounded-xl border border-slate-600/50 bg-slate-900/35 p-3">
          {group.careerName && <p className="mb-1 flex items-start gap-2 text-xs text-slate-300"><School size={14} className="mt-0.5 shrink-0 text-teal-300" /><span><span className="font-semibold text-slate-200">Carrera:</span> {group.careerName}</span></p>}
          <p className="flex items-start gap-2 text-xs text-slate-300"><Users size={14} className="mt-0.5 shrink-0 text-teal-300" /><span><span className="font-semibold text-slate-200">Curso:</span> {group.courseName}{group.academicYear ? ` · ${group.academicYear}` : ''}{group.shift ? ` · ${SHIFT[group.shift] || group.shift}` : ''}</span></p>
          <p className="mt-1 flex items-start gap-2 text-xs text-slate-300"><BookOpen size={14} className="mt-0.5 shrink-0 text-teal-300" /><span><span className="font-semibold text-slate-200">Materias:</span> {group.subjects.join(', ')}</span></p>
        </div>)}
      </div>}
  </div>;
}

// La API Clipboard funciona en HTTPS y localhost. El respaldo sirve en
// navegadores antiguos; nunca copiamos datos que el backend no haya autorizado.
async function writeContactToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return; } catch { /* Respaldo */ }
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand?.('copy')) throw new Error('No se pudo copiar.');
  } finally {
    field.remove();
  }
}
export default function InstitutionDirectoryView() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(initial);
  const [page, setPage] = useState(1);
  const [copyResult, setCopyResult] = useState(null);
  const feedbackTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);
  async function copyContact(person, kind, value) {
    try {
      await writeContactToClipboard(value);
      setCopyResult({ key: `${person.id}-${kind}`, ok: true, message: `${kind === 'email' ? 'Correo' : 'Teléfono'} copiado al portapapeles.` });
    } catch {
      setCopyResult({ key: `${person.id}-${kind}`, ok: false, message: 'No se pudo copiar. Comprobá los permisos del navegador.' });
    }
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setCopyResult(null), 2300);
  }
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
  // Defensa adicional frente a respuestas antiguas en caché: una tarjeta debe
  // tener al menos un dato visible para el usuario actual.
  const contacts = (query.data?.items || []).filter(person =>
    Boolean(person.email?.trim() || person.telefono?.trim()));
  return <section className="mx-auto max-w-7xl space-y-5 text-slate-100">
    <header className="eq-glass-panel rounded-2xl border border-teal-400/20 bg-gradient-to-r from-[#173b51] to-[#17273e] p-6 shadow-xl">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-300"><ShieldCheck size={15} /> Comunidad educativa</p>
      <h2 className="mt-2 flex items-center gap-3 text-2xl font-bold sm:text-3xl"><ContactRound size={30} /> Directorio institucional</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">Encontrá docentes por nombre, carrera, curso o materia. Los datos de contacto solo aparecen cuando la persona los comparte con tu rol desde Mi perfil.</p>
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
        <label className="relative"><span className="sr-only">Buscar por nombre, apellido, carrera, curso o materia</span><Search size={18} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input type="search" value={filter.search} onChange={e=>change('search',e.target.value)} placeholder="Nombre, apellido, carrera, curso o materia" className={`${selector} pl-10`} /></label>
        <select className={selector} aria-label="Filtrar por rol" value={filter.role} onChange={e=>change('role',e.target.value)}><option value="">Todos los cargos</option>{Object.entries(ROLE).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
        <select className={selector} aria-label="Filtrar por carrera" value={filter.careerId} onChange={e=>change('careerId',e.target.value)}><option value="">Todas las carreras</option>{careers.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}</select>
        <select className={selector} aria-label="Filtrar por curso" value={filter.courseId} onChange={e=>change('courseId',e.target.value)}><option value="">Todos los cursos</option>{courses.map(v=><option key={v.id} value={v.id}>{v.nombre} · {v.academicYear}</option>)}</select>
        <select className={selector} aria-label="Filtrar por materia" value={filter.subjectId} onChange={e=>change('subjectId',e.target.value)}><option value="">Todas las materias</option>{subjects.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}</select>
        <select className={selector} aria-label="Filtrar por turno" value={filter.shift} onChange={e=>change('shift',e.target.value)}><option value="">Todos los turnos</option>{Object.entries(SHIFT).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{total} contacto{total===1?'':'s'} encontrado{total===1?'':'s'}</span>
        <button type="button" onClick={()=>{setFilter(initial);setPage(1);}} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:border-teal-400">Limpiar filtros</button></div>
    </div>
    {copyResult && <p role={copyResult.ok ? 'status' : 'alert'} aria-live="polite" className={`rounded-xl border px-4 py-2 text-sm ${copyResult.ok ? 'border-teal-500/40 bg-teal-500/10 text-teal-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>{copyResult.message}</p>}
    {options.isError || query.isError ? <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300">{query.error?.response?.data?.message || options.error?.response?.data?.message || 'No se pudo cargar el directorio.'}</p> : null}
    {!institutionId ? <p className="p-5 text-slate-300">Seleccioná una institución para comenzar.</p>
    : query.isLoading ? <p className="p-5 text-slate-300">Cargando contactos…</p>
    : !contacts.length ? <p className="rounded-xl border border-slate-700 p-6 text-slate-300">No encontramos contactos que compartan datos con tu rol para esos filtros.</p>
    : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{contacts.map(person=><article key={person.id} className="eq-glass-card min-w-0 rounded-2xl border border-slate-700 bg-[#17283f]/95 p-5 transition hover:border-teal-500/35">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-200"><Users size={23}/></div><div className="min-w-0"><h3 className="break-words font-bold text-white">{person.firstName} {person.lastName}</h3><p className="text-sm text-teal-300">{person.roles.map(x=>ROLE[x]).join(' · ')}</p></div></div>
        {(person.position || person.specialty || person.shift) && <p className="mt-3 text-sm text-slate-300">{[person.position,person.specialty,SHIFT[person.shift]].filter(Boolean).join(' · ')}</p>}
        {person.roles.includes('TEACHER') && <TeacherAcademicInfo assignments={person.academicAssignments} />}
        <div className="mt-5 space-y-2 border-t border-slate-700 pt-4 text-sm">
          {person.email && <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg transition hover:bg-white/5">
            <a href={`mailto:${person.email}`} className="flex min-w-0 flex-1 items-center gap-2 break-all py-1 text-sky-300 hover:underline"><Mail size={17} className="shrink-0"/> <span>{person.email}</span></a>
            <button type="button" onClick={() => copyContact(person, 'email', person.email)}
              title="Copiar correo" aria-label={`Copiar correo de ${person.firstName} ${person.lastName}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/75 text-slate-200 transition hover:border-teal-400 hover:bg-teal-500/15 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
              {copyResult?.key === `${person.id}-email` && copyResult.ok ? <Check size={18} aria-hidden="true"/> : <Copy size={18} aria-hidden="true"/>}
            </button>
          </div>}
          {person.telefono && <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg transition hover:bg-white/5">
            <a href={`tel:${person.telefono.replace(/[^+0-9]/g,'')}`} className="flex min-w-0 flex-1 items-center gap-2 break-all py-1 text-sky-300 hover:underline"><Phone size={17} className="shrink-0"/> <span>{person.telefono}</span></a>
            <button type="button" onClick={() => copyContact(person, 'phone', person.telefono)}
              title="Copiar teléfono" aria-label={`Copiar teléfono de ${person.firstName} ${person.lastName}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/75 text-slate-200 transition hover:border-teal-400 hover:bg-teal-500/15 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
              {copyResult?.key === `${person.id}-phone` && copyResult.ok ? <Check size={18} aria-hidden="true"/> : <Copy size={18} aria-hidden="true"/>}
            </button>
          </div>}
        </div>
      </article>)}</div>}
    {total > 20 && <nav aria-label="Paginación del directorio" className="flex items-center justify-center gap-4 py-5">
      <button type="button" disabled={page===1} onClick={()=>setPage(v=>v-1)} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-30"><ChevronLeft size={16}/> Anterior</button>
      <span className="text-sm text-slate-300">Página {page} de {Math.ceil(total/20)}</span>
      <button type="button" disabled={page*20>=total} onClick={()=>setPage(v=>v+1)} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-30">Siguiente <ChevronRight size={16}/></button>
    </nav>}
  </section>;
}
