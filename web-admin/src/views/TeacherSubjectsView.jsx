import { useContext, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, Trophy, GraduationCap,
  Layers3, LoaderCircle, Sparkles, School, AlertCircle,
} from 'lucide-react';
import { useMyTeacherSubjects } from '../hooks/useTeacherSubject';
import { AuthContext } from '../context/AuthContext';
import { SHIFTS, shiftLabel } from '../utils/courseShift';

const action = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

export default function TeacherSubjectsView() {
  const { user } = useContext(AuthContext);
  const isTeacher = user?.roles?.some(role => String(typeof role === 'string' ? role : role?.name).toUpperCase() === 'TEACHER') || Boolean(user?.teacherProfile);
  const { data: assignments = [], isLoading, isError, error, refetch } = useMyTeacherSubjects();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const [careerFilter, setCareerFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const chosen = params.get('courseId');

  // El identificador real del curso impide mezclar materias de distintos cursos
  // que tengan nombres iguales (p. ej. «1.º A» de dos instituciones).
  const courses = useMemo(() => {
    const map = new Map();
    for (const assignment of assignments) {
      if (!assignment.course?.id) continue;
      const id = String(assignment.course.id);
      if (!map.has(id)) {
        map.set(id, {
          id,
          title: assignment.course.nombre,
          year: assignment.course.academicYear,
          shift: assignment.course.shift,
          careerId: String(assignment.course.careerId ?? assignment.course.career?.id ?? 'none'),
          careerName: assignment.course.career?.nombre ?? 'Sin carrera',
          subjects: [],
        });
      }
      map.get(id).subjects.push(assignment);
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true }));
  }, [assignments]);
  const careers = useMemo(() => {
    const map = new Map();
    courses.forEach(course => {
      if (!map.has(course.careerId)) map.set(course.careerId, { id: course.careerId, name: course.careerName, count: 0 });
      map.get(course.careerId).count += 1;
    });
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name, 'es'));
  }, [courses]);
  const selected = courses.find(c => c.id === chosen);
  const currentCareer = selected?.careerId ?? careerFilter;
  const careerCourses = courses.filter(c => c.careerId === currentCareer);
  const availableShifts = [...new Set(careerCourses.map(c => c.shift ?? ''))];
  const visible = careerCourses.filter(c =>
    (!shiftFilter || (shiftFilter === 'legacy' ? !c.shift : c.shift === shiftFilter)) &&
    `${c.title} ${shiftLabel(c.shift)}`.toLocaleLowerCase('es').includes(filter.trim().toLocaleLowerCase('es')));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-slate-100">
      <header className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-slate-900 to-blue-950/70 p-6 sm:p-8">
        <div className="flex items-start gap-4"><School className="shrink-0 text-blue-300" size={32} />
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Espacio docente</span>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Mis cursos</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Primero elegí la carrera, luego el curso y su turno. Después seleccioná la materia para planificar unidades didácticas, desarrollar temas, publicar contenidos y consultar las evaluaciones.</p>
          </div>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
        <span className={!currentCareer ? 'rounded-full bg-blue-500/20 px-3 py-1.5 text-blue-200' : ''}>1 · Carrera</span>
        <ArrowRight size={14}/><span className={currentCareer && !selected ? 'rounded-full bg-blue-500/20 px-3 py-1.5 text-blue-200' : ''}>2 · Curso</span>
        <ArrowRight size={14}/><span className={selected ? 'rounded-full bg-blue-500/20 px-3 py-1.5 text-blue-200' : ''}>3 · Materia y seguimiento</span>
      </div>
      {isLoading && <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-6"><LoaderCircle className="animate-spin text-blue-300"/> Cargando asignaciones...</div>}
      {isError && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 text-rose-200"><AlertCircle className="mr-2 inline" size={18}/> No se pudieron cargar los cursos: {error?.response?.data?.message || error?.message || 'Error de conexión.'}<button className="ml-3 underline" onClick={() => refetch()}>Reintentar</button></div>}
      {!isLoading && !isError && !selected && !careerFilter && <section className="rounded-2xl border border-slate-700 bg-slate-900/85 p-5 sm:p-7">
        <h2 className="mb-1 text-xl font-bold">1. Seleccioná la carrera</h2>
        <p className="mb-5 text-sm text-slate-400">Al elegir una carrera aparecerán tus cursos y el turno de cada uno.</p>
        {careers.length > 0 ? <label className="block max-w-xl space-y-2 text-sm font-semibold text-slate-200">
          <span>Carrera o nivel</span>
          <select className="w-full cursor-pointer rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white focus:border-blue-400"
            value={careerFilter} onChange={e => { setCareerFilter(e.target.value); setShiftFilter(''); setFilter(''); }}>
            <option value="">Elegí una carrera</option>
            {careers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.count} curso(s)</option>)}
          </select>
        </label> : <p className="text-sm text-slate-400">No tenés asignaciones docentes vigentes.</p>}
      </section>}
      {!isLoading && !isError && !selected && Boolean(careerFilter) && <>
        <section className="rounded-2xl border border-slate-700 bg-slate-900/85 p-5 sm:p-7">
          <button type="button" className="mb-3 inline-flex items-center gap-2 text-sm text-indigo-300 hover:underline" onClick={() => { setCareerFilter(''); setShiftFilter(''); }}><ArrowLeft size={16}/> Cambiar carrera</button>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">2. Elegí el curso</h2><p className="mt-1 text-sm text-slate-400">{careerCourses.length} cursos en {careers.find(c => c.id === careerFilter)?.name}</p></div>
            {availableShifts.length > 1 && <label className="flex flex-col gap-1 text-xs text-slate-400">Turno (opcional)<select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white"><option value="">Todos los turnos</option>{SHIFTS.filter(s => availableShifts.includes(s.value)).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}{availableShifts.includes('') && <option value="legacy">Sin turno asignado</option>}</select></label>}
            <label className="flex flex-col gap-1 text-xs text-slate-400">Buscar curso<input className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Ej. 5to A" /></label>
          </div>
          {careerCourses.length === 0 && <p className="rounded-xl bg-slate-800 p-5 text-slate-300">Todavía no tenés cursos con materias asignadas. Solicitá la asignación al equipo directivo.</p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(course => <button type="button" key={course.id} onClick={() => setParams({ courseId: course.id })} className="group rounded-2xl border border-slate-700 bg-slate-800/65 p-5 text-left transition hover:border-blue-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <div className="flex items-start justify-between gap-3"><GraduationCap className="text-blue-300" size={27}/><ArrowRight className="text-slate-400 group-hover:text-blue-300" size={20}/></div>
            <h3 className="mt-4 text-xl font-bold">{course.title}</h3><span className="mt-2 inline-flex rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200">Turno {shiftLabel(course.shift)}</span>
            <p className="mt-2 text-sm text-slate-400">Ciclo lectivo {course.year ?? '—'} · {course.subjects.length} {course.subjects.length === 1 ? 'asignación' : 'asignaciones'}</p>
          </button>)}</div>
          {!!courses.length && !visible.length && <p className="mt-4 text-sm text-slate-400">No hay cursos que coincidan con la búsqueda.</p>}
        </section>
      </>}
      {!isLoading && !isError && selected && <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div>
          <button type="button" onClick={() => setParams({})} className="mb-3 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"><ArrowLeft size={16}/> Volver a cursos de {selected.careerName}</button>
          <h2 className="text-2xl font-bold">{selected.title} · Turno {shiftLabel(selected.shift)}</h2><p className="mt-1 text-sm text-slate-400">Elegí la materia que querés administrar. Año {selected.year ?? '—'}.</p>
        </div><span className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300">{selected.subjects.length} materias asignadas</span></div>
        <div className="grid gap-4 lg:grid-cols-2">{selected.subjects.map(row => <article key={row.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-start gap-3"><BookOpen className="shrink-0 text-blue-300" size={27}/><div className="min-w-0 flex-1"><h3 className="text-lg font-bold">{row.subject?.nombre || 'Materia sin nombre'}</h3><p className="mt-1 text-xs text-slate-400">{(row.activities || []).length} actividades · {row.isActive ? 'Asignación vigente' : 'Asignación histórica'}</p></div></div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">Planificá unidades y temas. Dentro de cada tema, subí material de estudio o generá actividades con IA.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={`/dashboard/my-subjects/${row.id}/units`} className={`${action} border-indigo-400/60 bg-indigo-600/85 text-white hover:border-indigo-300 hover:bg-indigo-500 focus-visible:ring-indigo-400`}><Layers3 size={16}/> Planificación y materiales</Link>
            {isTeacher && <Link to={`/dashboard/my-subjects/${row.id}/studio`} className={`${action} border-amber-300 bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/20 hover:bg-amber-300 focus-visible:ring-amber-300`}><Sparkles size={16}/> Crear actividades</Link>}
            {isTeacher && <Link to={`/dashboard/my-subjects/${row.id}/results`} className={`${action} border-emerald-400/70 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-400`}><ClipboardCheck size={16}/> Resultados y notas</Link>}
            {isTeacher && <Link to={`/dashboard/my-subjects/${row.id}/results?view=ranking`} className={`${action} border-amber-300/70 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 focus-visible:ring-amber-300`}><Trophy size={16}/> Clasificaciones</Link>}
          </div>
        </article>)}</div>
      </section>}
      {!isLoading && !isError && chosen && !selected && <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-5 text-amber-100">El curso solicitado ya no figura entre tus asignaciones. <button type="button" className="underline" onClick={() => setParams({})}>Volver a cursos</button>.</div>}
    </div>
  );
}
