import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Archive, ArchiveRestore, BookOpen, CalendarClock, CheckCircle2,
  ChevronLeft, ClipboardCheck, Eye, GraduationCap, RefreshCw,
  Search, Sparkles, Trash2, TrendingUp, Users, X, XCircle, Trophy, ListChecks, UserRound, ChevronRight,
} from 'lucide-react';
import { assessmentService } from '../services/assessment.service';

const formatDate = iso => iso ? new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(iso)) : '—';

const describeAnswer = (value, options) => {
  if (typeof value === 'boolean') return value ? 'Verdadero' : 'Falso';
  if (value === null || value === undefined) return 'Sin respuesta';
  const choice = (options || []).find(option => String(option.id) === String(value));
  return choice?.text || String(value);
};

const gradeNumber = row => Number.isFinite(Number(row.grade))
  ? Number(row.grade) : Number(row.score || 0) / 10;
const gradeText = value => Number(value || 0).toFixed(1).replace('.', ',');
const gradeStyle = grade => grade >= 8
  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
  : grade >= 6
    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
    : 'border-rose-500/40 bg-rose-500/15 text-rose-300';
const scoreStyle = score => Number(score) >= 80
  ? 'bg-emerald-500' : Number(score) >= 60 ? 'bg-amber-400' : 'bg-rose-500';
const inputStyle = 'w-full rounded-xl border border-slate-700 bg-[#101b30] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20';
const actionBase = 'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40';

export default function TeacherAssessmentsView() {
  const { teacherSubjectId: routeAssignmentId } = useParams();
  const [params] = useSearchParams();
  const activityId = params.get('activityId') || '';
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [rows, setRows] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ activities: [], students: [] });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const requestSequence = useRef(0);
  const [filterVersion, setFilterVersion] = useState(0);
  const [studentId, setStudentId] = useState('');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [leaderboard, setLeaderboard] = useState(null);
  const [rankingActivity, setRankingActivity] = useState(activityId);
  const [rankingStage, setRankingStage] = useState(activityId ? 'detail' : 'general');
  const [rankingLoading, setRankingLoading] = useState(false);
  const [viewMode, setViewMode] = useState(params.get('view') === 'ranking' ? 'ranking' : params.get('view') === 'student' ? 'student' : 'activity');
  const [focusActivity, setFocusActivity] = useState(activityId);


  useEffect(() => {
    let active = true;
    assessmentService.assignments().then(items => {
      if (!active) return;
      setAssignments(items);
      const matching = items.find(item => String(item.id) === String(routeAssignmentId));
      setAssignmentId(matching ? String(matching.id) : '');
      if (routeAssignmentId && !matching) {
        setError('No se encontró una asignación docente autorizada para estos resultados.');
      }
    }).catch(e => {
      if (active) setError(e.response?.data?.message || 'No se pudieron cargar las materias.');
    });
    return () => { active = false; };
  }, [routeAssignmentId]);

  useEffect(() => {
    setFocusActivity(activityId);
    setRankingActivity(activityId);
    setRankingStage(activityId ? 'detail' : 'general');
    setStudentId('');
  }, [assignmentId, activityId]);

  useEffect(() => {
    if (!assignmentId) { setLeaderboard(null); return; }
    let alive = true;
    setRankingLoading(true);
    assessmentService.leaderboard(assignmentId, rankingActivity)
      .then(data => { if (alive) { setLeaderboard(data); setError(''); } })
      .catch(e => { if (alive) { setLeaderboard(null); setError(e.response?.data?.message || 'No se pudo consultar la clasificación.'); } })
      .finally(() => { if (alive) setRankingLoading(false); });
    return () => { alive = false; };
  }, [assignmentId, rankingActivity]);

  const loadAttempts = async () => {
    const requestId = ++requestSequence.current;
    if (!assignmentId || viewMode === 'ranking' ||
      (viewMode === 'activity' && !focusActivity) ||
      (viewMode === 'student' && !studentId)) {
      setRows([]);
      setPagination({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
      setBusy(false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await assessmentService.list(assignmentId, {
        includeArchived, page, pageSize: 50,
        activityId: viewMode === 'activity' ? focusActivity : '',
        studentId: viewMode === 'student' ? studentId : '',
      });
      if (requestId !== requestSequence.current) return;
      setRows(data.records || []);
      setPagination(data.pagination || { page: 1, pageSize: 50, total: data.records?.length || 0, totalPages: 1 });
      if (data.pagination?.page && data.pagination.page !== page) setPage(data.pagination.page);
    } catch (e) {
      if (requestId !== requestSequence.current) return;
      setError(e.response?.data?.message || 'No se pudo consultar el historial.');
      setRows([]);
    } finally {
      if (requestId === requestSequence.current) setBusy(false);
    }
  };

  // Los enlaces directos del taller deben actualizar el filtro aunque React
  // reutilice el mismo componente en otra ruta.
  useEffect(() => {
    setFocusActivity(activityId);
    setRankingActivity(activityId);
    setRankingStage(activityId ? 'detail' : 'general');
    if (activityId && params.get('view') !== 'ranking') setViewMode('activity');
  }, [activityId, params]);

  useEffect(() => {
    let active = true;
    if (!assignmentId) {
      setFilterOptions({ activities: [], students: [] });
      return () => { active = false; };
    }
    assessmentService.filters(assignmentId, includeArchived)
      .then(options => { if (active) setFilterOptions({ activities: options.activities || [], students: options.students || [] }); })
      .catch(e => { if (active) { setFilterOptions({ activities: [], students: [] }); setError(e.response?.data?.message || 'No se pudieron cargar los filtros de resultados.'); } });
    return () => { active = false; };
  }, [assignmentId, includeArchived, filterVersion]);

  useEffect(() => { setPage(1); }, [assignmentId, viewMode, studentId, focusActivity, includeArchived]);

  useEffect(() => {
    setSelected(null);
    setDeleting(null);
    loadAttempts();
    // Cada respuesta anterior queda invalidada al cambiar el filtro o desmontar la vista.
    return () => { requestSequence.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, includeArchived, page, studentId, focusActivity, viewMode]);

  const assignment = assignments.find(item => String(item.id) === String(assignmentId));
  const students = useMemo(() => {
    const map = new Map();
    // Todos los alumnos históricos del filtro vienen del backend, no de la página.
    for (const entry of filterOptions.students || []) map.set(String(entry.id), entry.name);
    // Incluimos también matriculados activos que aún no jugaron.
    for (const entry of leaderboard?.rows || []) {
      if (entry.studentId != null && !map.has(String(entry.studentId))) map.set(String(entry.studentId), entry.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [filterOptions.students, leaderboard]);

  const activityGroups = useMemo(() => {
    const groups = new Map();
    for (const entry of filterOptions.activities || []) {
      groups.set(String(entry.id), {
        key: String(entry.id), label: entry.title,
        results: entry.results || 0, studentCount: entry.studentCount || 0,
      });
    }
    // También se ofrecen actividades activas sin ninguna realización.
    for (const activity of leaderboard?.activities || []) {
      const key = String(activity.id);
      if (!groups.has(key)) groups.set(key, { key, label: activity.title, results: 0, studentCount: 0 });
    }
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [filterOptions.activities, leaderboard]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return rows.filter(row => {
      if (viewMode === 'activity') {
        const key = row.activityId == null ? `historical:${row.content}` : String(row.activityId);
        if (!focusActivity || key !== focusActivity) return false;
      }
      if (viewMode === 'student' && (!studentId || String(row.studentId) !== studentId)) return false;
      if (!query) return true;
      return [row.studentName, row.content, row.unitName, row.topicName, row.subjectName]
        .some(value => String(value || '').toLocaleLowerCase('es').includes(query));
    });
  }, [rows, studentId, search, viewMode, focusActivity]);

  const statistics = useMemo(() => {
    const count = filtered.length;
    return {
      count,
      students: new Set(filtered.map(row => row.studentId)).size,
      score: count ? Math.round(filtered.reduce((sum, row) => sum + Number(row.score || 0), 0) / count) : 0,
      grade: count ? filtered.reduce((sum, row) => sum + gradeNumber(row), 0) / count : 0,
    };
  }, [filtered]);

  const open = async id => {
    setError('');
    try {
      setSelected(await assessmentService.detail(id));
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo abrir la corrección.');
    }
  };

  const archive = async row => {
    setError('');
    try {
      await assessmentService.archive(row.id, !row.archived);
      setNotice(row.archived ? 'Resultado restaurado.' : 'Resultado archivado: no aparece en la lista principal.');
      setSelected(null);
      setFilterVersion(v => v + 1);
      await loadAttempts();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo cambiar el estado.');
    }
  };

  const remove = async () => {
    if (!deleting || confirmText !== 'BORRAR') return;
    setError('');
    try {
      const result = await assessmentService.remove(deleting.id);
      setNotice(`Resultado eliminado. Puntos descontados: ${result.pointsReversed}.`);
      setDeleting(null);
      setConfirmText('');
      setSelected(null);
      setFilterVersion(v => v + 1);
      await loadAttempts();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo eliminar el resultado.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-16 text-slate-100">
      {activityId && <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/40 bg-violet-500/15 p-3 text-sm text-violet-100">
        <span>Resultados filtrados por actividad #{activityId}</span>
        <Link to={`/dashboard/my-subjects/${routeAssignmentId}/results`} className="rounded-lg bg-violet-500 px-3 py-2 font-semibold">Ver todas</Link>
      </div>}
      <header className="relative overflow-hidden rounded-3xl border border-indigo-400/25 bg-gradient-to-r from-[#152449] via-[#162443] to-[#102b33] p-4 shadow-lg shadow-slate-950/20 sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-indigo-500/15 blur-3xl" />
        <Link to="/dashboard/my-subjects" className="relative mb-2 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 transition hover:text-white">
          <ChevronLeft size={16} /> Volver a mis cursos
        </Link>
        <div className="relative flex items-start gap-4">
          <div className="rounded-2xl border border-indigo-300/25 bg-indigo-400/15 p-3 text-indigo-200"><ClipboardCheck size={28} /></div>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles size={12} /> Seguimiento académico
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Resultados y notas</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">Consultá calificaciones, revisá cada respuesta y administrá el historial de las actividades de tus alumnos.</p>
          </div>
        </div>
      </header>

      <nav aria-label="Explorar evaluaciones" className="grid gap-2 rounded-2xl border border-indigo-400/25 bg-slate-900/80 p-3 sm:grid-cols-3">
        {[
          { key: 'activity', label: 'Por actividad', Icon: ListChecks, hint: 'Actividad → alumnos' },
          { key: 'student', label: 'Por alumno', Icon: UserRound, hint: 'Alumno → historial' },
          { key: 'ranking', label: 'Clasificaciones', Icon: Trophy, hint: 'Por actividad y general' },
        ].map(tab => <button key={tab.key} type="button" onClick={() => setViewMode(tab.key)}
          aria-current={viewMode === tab.key ? 'page' : undefined}
          className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${viewMode === tab.key ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10' : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-indigo-400 hover:bg-indigo-500/15'}`}>
          <tab.Icon size={23} className="shrink-0" />
          <span className="min-w-0"><strong className="block text-sm">{tab.label}</strong><small className="block text-[11px] opacity-80">{tab.hint}</small></span>
        </button>)}
      </nav>

      {viewMode !== 'ranking' && <>
        <section className="rounded-2xl border border-violet-400/25 bg-[#101b2f]/90 p-4 sm:p-5" aria-label={viewMode === 'activity' ? 'Elegir actividad' : 'Elegir alumno'}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold text-violet-100">
              {viewMode === 'activity' ? <ListChecks size={19} /> : <Users size={19} />}
              {viewMode === 'activity' ? '1. Elegí la actividad' : '1. Elegí al alumno'}
            </h2>
            <span className="text-xs text-slate-400">{viewMode === 'activity' ? `${activityGroups.length} actividades` : `${students.length} alumnos`}</span>
          </div>
          <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {viewMode === 'activity' ? activityGroups.map(group =>
              <button type="button" key={group.key} onClick={() => { setFocusActivity(group.key); setSelected(null); }}
                aria-pressed={focusActivity === group.key}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${focusActivity === group.key ? 'border-amber-300 bg-amber-500/15 text-amber-100' : 'border-violet-500/25 bg-slate-800/50 text-slate-200 hover:bg-violet-500/15'}`}>
                <strong className="text-sm">{group.label}</strong>
                <span className="text-xs opacity-80">{group.studentCount} alumnos · {group.results} intentos</span>
              </button>) : students.map(([id, name]) =>
              <button type="button" key={id} onClick={() => { setStudentId(id); setSelected(null); }}
                aria-pressed={studentId === id}
                className={`rounded-xl border p-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${studentId === id ? 'border-amber-300 bg-amber-500/15 text-amber-100' : 'border-violet-500/25 bg-slate-800/50 text-slate-200 hover:bg-violet-500/15'}`}>
                <UserRound className="mr-2 inline" size={16}/>{name}
              </button>)}
          </div>
          {(viewMode === 'activity' && !focusActivity || viewMode === 'student' && !studentId) && <p className="mt-3 text-sm text-slate-400">Seleccioná una tarjeta para ver su historial, respuestas y calificaciones.</p>}
        </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de resultados">
        {[
          { label: 'Intentos en esta página', value: statistics.count, icon: ClipboardCheck, tone: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
          { label: 'Alumnos en esta página', value: statistics.students, icon: Users, tone: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
          { label: 'Aciertos (página)', value: `${statistics.score}%`, icon: TrendingUp, tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
          { label: 'Nota media (página)', value: gradeText(statistics.grade), icon: GraduationCap, tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
            <div className="flex items-center gap-2 text-xs font-medium"><card.icon size={16} /> {card.label}</div>
            <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-50">{card.value}</div>
          </div>
        ))}
      </section>

      </>}
      {viewMode === 'ranking' && error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>}
      {viewMode === 'ranking' && (
      <section className="rounded-2xl border border-amber-500/30 bg-[#101b2f]/95 p-4 sm:p-5" aria-label="Clasificaciones por materia">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-amber-200"><Trophy size={21}/> Clasificaciones de la materia</h2>
            <p className="mt-1 text-xs text-slate-400">{assignment ? `${assignment.subjectName} · ${assignment.courseName} · ${assignment.academicYear}` : 'Elegí una materia de tus asignaciones.'}</p>
          </div>
          <div className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100">Solo alumnos de tu curso</div>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => { setRankingActivity(''); setRankingStage('general'); }}
            aria-pressed={rankingStage === 'general'}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${rankingStage === 'general' ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/10' : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-violet-400'}`}>
            <TrendingUp size={18}/> General de la materia
          </button>
          <button type="button" onClick={() => { setRankingActivity(''); setRankingStage('list'); }}
            aria-pressed={rankingStage !== 'general'}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${rankingStage !== 'general' ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/10' : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-violet-400'}`}>
            <ListChecks size={18}/> Por actividad
          </button>
        </div>
        {rankingStage === 'list' ? (
          <div className="space-y-3">
            <div><h3 className="text-base font-bold text-violet-100">Actividades de {assignment?.subjectName || 'la materia'}</h3>
              <p className="mt-1 text-xs text-slate-400">Seleccioná una actividad para consultar la tabla de posiciones de quienes la completaron.</p></div>
            <div className="grid gap-2">
              {(leaderboard?.activities || []).map(activity => <button type="button" key={activity.id}
                onClick={() => { setRankingActivity(String(activity.id)); setRankingStage('detail'); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-[#202044] to-[#17233d] p-4 text-left transition hover:border-amber-400/70 hover:from-[#2a2455] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-200"><ClipboardCheck size={22}/></span>
                <span className="min-w-0 flex-1"><strong className="block break-words text-sm text-white">{activity.title}</strong><small className="mt-1 block text-xs text-slate-400">Ver puestos, puntos y calificaciones</small></span>
                <span className="rounded-xl bg-amber-400 p-2 text-slate-950"><ChevronRight size={20}/></span>
              </button>)}
              {!rankingLoading && !leaderboard?.activities?.length && <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 text-sm text-slate-300">Esta materia todavía no tiene actividades publicadas.</p>}
            </div>
          </div>
        ) : (
          <div>
            {rankingStage === 'detail' && <button type="button" onClick={() => { setRankingActivity(''); setRankingStage('list'); }}
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-500/20">
              <ChevronLeft size={16}/> Volver a actividades
            </button>}
            <h3 className="mb-2 text-base font-bold text-violet-100">{rankingStage === 'detail' ? leaderboard?.activityName || 'Clasificación de actividad' : `Promedio general de ${assignment?.subjectName || 'la materia'}`}</h3>
            <p className="mb-4 text-xs leading-relaxed text-slate-400">{rankingStage === 'detail'
              ? 'Se incluye solamente a quienes completaron esta actividad. Cuenta la primera partida competitiva; las repeticiones son prácticas sin puntos ni cambios en el ranking.'
              : 'Promedio de los primeros resultados competitivos de esta materia. Las pendientes cuentan como cero; las prácticas posteriores no modifican posiciones.'}</p>
            {rankingLoading ? <p className="py-5 text-sm text-amber-200">Calculando posiciones…</p> :
              (leaderboard?.rows || []).filter(row => rankingStage !== 'detail' || row.completedCount > 0).length ?
              <div className="max-h-[440px] overflow-auto rounded-xl border border-slate-700">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#26334c] text-amber-200"><tr><th className="p-3">#</th><th className="p-3">Alumno</th><th className="p-3">Puntos</th><th className="p-3">Realizadas</th><th className="p-3">Nota</th></tr></thead>
                  <tbody>{(leaderboard?.rows || []).filter(row => rankingStage !== 'detail' || row.completedCount > 0).map(row => <tr key={row.studentId} className="border-t border-slate-700/70 odd:bg-violet-500/5 hover:bg-violet-500/15">
                    <td className="p-3 font-extrabold text-amber-300">{row.position ? `#${row.position}` : '—'}</td>
                    <td className="p-3 font-semibold text-white">{row.name}</td>
                    <td className="p-3 tabular-nums">{row.points ?? 0}</td>
                    <td className="p-3 tabular-nums">{row.completedCount}/{row.totalActivities}</td>
                    <td className="p-3 tabular-nums text-violet-200">{gradeText(row.grade)}/10</td>
                  </tr>)}</tbody>
                </table>
              </div> : <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 text-sm text-slate-300">{rankingStage === 'detail' ? 'Ningún alumno completó todavía esta actividad.' : 'Todavía no hay resultados para clasificar.'}</p>}
          </div>
        )}
      </section>
      )}

      {viewMode !== 'ranking' && <>
      <section className="rounded-2xl border border-slate-700/80 bg-[#101b2f]/90 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-200"><BookOpen size={17} className="text-indigo-300" /> Filtros del historial</div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">Curso y materia</span>
            <div className={`${inputStyle} min-h-[46px] truncate border-indigo-500/30 bg-indigo-500/10 text-indigo-100`} title={assignment ? `${assignment.courseName} · ${assignment.subjectName}` : ''}>
              {assignment ? `${assignment.courseName} · ${assignment.subjectName} (${assignment.academicYear})` : 'Sin asignación autorizada'}
            </div>
          </div>
          {viewMode === 'student' && <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">Alumno
            <select className={`${inputStyle} cursor-pointer`} value={studentId} onChange={e => setStudentId(e.target.value)}>
              <option value="">Todos los alumnos</option>
              {students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>}
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">Buscar contenido
            <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className={`${inputStyle} pl-10`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en esta página..." />
            </div>
          </label>
          <button type="button" onClick={loadAttempts} disabled={busy || !assignmentId} className={`${actionBase} h-[46px] border-indigo-500/40 bg-indigo-500/20 px-4 text-indigo-100 hover:bg-indigo-500/30`}>
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">La búsqueda y los promedios se calculan sobre la página visible. Para consultar un alumno o una actividad, usá las tarjetas superiores: aplican el filtro a todo el historial del servidor.</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-800/45 px-3 py-2 text-xs font-medium text-slate-300">
          <input type="checkbox" className="accent-indigo-500" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} /> Incluir resultados archivados
        </label>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200"><CheckCircle2 size={18} /> {notice}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#101a2e]/95 shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 px-5 py-4">
          <div className="flex items-center gap-2 font-bold"><CalendarClock size={18} className="text-sky-300" /> {viewMode === 'activity' ? '2. Resultados de la actividad' : '2. Historial del alumno'}</div>
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">{filtered.length} visibles · {pagination.total} en total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-[#1a2a44] text-[11px] uppercase tracking-wider text-slate-300">
              <tr>{['Alumno', 'Contenido', 'Unidad', 'Tema', 'Puntaje', 'Calificación', 'Fecha y hora', 'Acciones'].map(h => <th className="px-4 py-4 font-bold" key={h}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((r, i) => {
                const grade = gradeNumber(r);
                return (
                  <tr key={r.id} className={`transition-colors hover:bg-indigo-500/10 ${i % 2 ? 'bg-slate-800/20' : 'bg-transparent'} ${r.archived ? 'opacity-70' : ''}`}>
                    <td className="px-4 py-4 align-middle font-semibold text-slate-100"><span className="inline-flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/15 text-xs font-bold text-violet-200">{String(r.studentName || '?').trim().charAt(0).toUpperCase()}</span>{r.studentName}</span></td>
                    <td className="px-4 py-4 align-middle"><div className="max-w-[230px] font-medium text-slate-100">{r.content}</div>{r.archived && <span className="mt-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">ARCHIVADO</span>}</td>
                    <td className="px-4 py-4 align-middle"><span className="inline-flex rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-200">{r.unitName || 'Sin unidad'}</span></td>
                    <td className="px-4 py-4 align-middle"><span className="inline-flex rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-200">{r.topicName || 'Sin tema'}</span></td>
                    <td className="px-4 py-4 align-middle"><div className="min-w-[105px]"><span className="font-bold text-slate-100">{r.score}%</span><div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${scoreStyle(r.score)}`} style={{ width: `${Math.max(0, Math.min(100, Number(r.score) || 0))}%` }} /></div><div className="mt-1.5 text-[11px] text-slate-400">{r.earnedPoints == null ? 'Sin puntos históricos' : `+${r.earnedPoints} pts`}</div></div></td>
                    <td className="px-4 py-4 align-middle"><span className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-extrabold ${gradeStyle(grade)}`}>{gradeText(grade)}/10</span></td>
                    <td className="px-4 py-4 align-middle text-xs text-slate-300">{formatDate(r.dateTime)}</td>
                    <td className="px-4 py-4 align-middle"><div className="flex max-w-[220px] flex-wrap gap-2">
                      <button type="button" className={`${actionBase} border-sky-500/35 bg-sky-500/10 text-sky-200 hover:bg-sky-500/25`} onClick={() => open(r.id)}><Eye size={14} /> Ver respuestas</button>
                      <button type="button" className={`${actionBase} border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25`} onClick={() => archive(r)}>{r.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}{r.archived ? 'Restaurar' : 'Archivar'}</button>
                      <button type="button" className={`${actionBase} border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25`} onClick={() => { setDeleting(r); setConfirmText(''); }}><Trash2 size={14} /> Eliminar</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!busy && filtered.length === 0 && !error && <div className="px-6 py-12 text-center"><BookOpen size={32} className="mx-auto mb-3 text-indigo-300" /><p className="font-semibold text-slate-200">Sin resultados para estos filtros</p><p className="mt-1 text-xs text-slate-400">Probá con otro alumno o verificá que haya actividades completadas.</p></div>}
        {busy && <div className="p-8 text-center text-sm text-sky-300">Consultando resultados...</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 px-5 py-4 text-xs text-slate-300">
          <span>Página {pagination.page} de {pagination.totalPages} · {pagination.total} resultados encontrados</span>
          <div className="flex items-center gap-2">
            <button type="button" className={`${actionBase} border-slate-600 text-slate-100 hover:bg-slate-700`} disabled={busy || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <button type="button" className={`${actionBase} border-slate-600 text-slate-100 hover:bg-slate-700`} disabled={busy || page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </div>
      </section>

      </>}

      {selected && <div role="dialog" aria-modal="true" aria-label="Corrección del intento" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-indigo-400/30 bg-[#101a2e] p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4"><div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300"><ClipboardCheck size={15} /> Detalle de evaluación</div>
            <h2 className="text-xl font-bold">{selected.studentName} · {selected.content}</h2>
            <p className="mt-1 text-sm text-slate-400">{selected.courseName} · {selected.subjectName} · {selected.unitName} / {selected.topicName}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className={`rounded-lg border px-3 py-1.5 font-bold ${gradeStyle(gradeNumber(selected))}`}>{gradeText(gradeNumber(selected))}/10</span><span className="rounded-lg bg-slate-800 px-3 py-1.5">{selected.score}% de aciertos</span><span className="text-xs text-slate-400">{formatDate(selected.dateTime)}</span></div>
          </div><button type="button" className={`${actionBase} border-slate-600 text-slate-200 hover:bg-slate-700`} onClick={() => setSelected(null)}><X size={16} /> Cerrar</button></div>
          {!selected.review ? <p className="mt-5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">Este intento se creó antes de registrar las respuestas individuales. No es posible reconstruirlas.</p> :
            <div className="mt-5 space-y-3">{selected.review.map((q, i) => <div key={`${q.id}-${i}`} className={`rounded-xl border p-4 ${q.isCorrect ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-rose-500/25 bg-rose-500/10'}`}>
              <div className="flex items-start gap-2">{q.isCorrect ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-300" />}<div><p className="font-semibold">{i + 1}. {q.text}</p><p className={`mt-2 text-sm ${q.isCorrect ? 'text-emerald-200' : 'text-rose-200'}`}>{q.isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'} · Respondió: {describeAnswer(q.givenAnswer, q.options)}</p>{!q.isCorrect && <p className="mt-1 text-sm text-sky-200">Respuesta esperada: {describeAnswer(q.correctAnswer, q.options)}</p>}{q.explanation && <p className="mt-2 rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-100"><strong>Explicación:</strong> {q.explanation}</p>}</div></div>
            </div>)}</div>}
        </div>
      </div>}

      {deleting && <div role="dialog" aria-modal="true" aria-label="Eliminar definitivamente" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/45 bg-[#151a2b] p-6 shadow-2xl">
          <div className="flex items-center gap-2 text-rose-300"><Trash2 size={22} /><h2 className="text-xl font-bold">Eliminar definitivamente</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300"><strong>{deleting.studentName}</strong> · {deleting.content}. La primera partida competitiva está protegida y no puede borrarse: sí puede archivarse. Los intentos históricos posteriores pueden eliminarse si se conocen sus puntos; se descontarán las recompensas que otorgaron. Esta operación es irreversible.</p>
          <label className="mt-4 block text-sm text-slate-200">Escribí <strong className="text-rose-300">BORRAR</strong> para confirmar
            <input className={`${inputStyle} mt-2`} value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="BORRAR" />
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className={`${actionBase} border-slate-600 text-slate-200 hover:bg-slate-700`} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className={`${actionBase} border-rose-500 bg-rose-600 text-white hover:bg-rose-500`} disabled={confirmText !== 'BORRAR'} onClick={remove}>Eliminar definitivamente</button></div>
        </div>
      </div>}
    </div>
  );
}
