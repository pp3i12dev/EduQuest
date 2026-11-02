import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Archive, ArchiveRestore, BookOpen, CalendarClock, CheckCircle2,
  ChevronLeft, ClipboardCheck, Eye, GraduationCap, RefreshCw,
  Search, Sparkles, Trash2, TrendingUp, Users, X, XCircle,
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
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [rows, setRows] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirmText, setConfirmText] = useState('');

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

  const loadAttempts = async () => {
    if (!assignmentId) { setRows([]); return; }
    setBusy(true);
    setError('');
    try {
      const data = await assessmentService.list(assignmentId, { includeArchived });
      setRows(data.records || []);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo consultar el historial.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setSelected(null);
    setDeleting(null);
    setStudentId('');
    setSearch('');
    loadAttempts();
    // La consulta depende de la asignación y de si se incluyen los archivados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, includeArchived]);

  const assignment = assignments.find(item => String(item.id) === String(assignmentId));
  const students = useMemo(() => Array.from(new Map(rows.map(r => [String(r.studentId), r.studentName])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'es')), [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return rows.filter(row => {
      if (studentId && String(row.studentId) !== studentId) return false;
      if (!query) return true;
      return [row.studentName, row.content, row.unitName, row.topicName, row.subjectName]
        .some(value => String(value || '').toLocaleLowerCase('es').includes(query));
    });
  }, [rows, studentId, search]);

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
      await loadAttempts();
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo eliminar el resultado.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-16 text-slate-100">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-400/25 bg-gradient-to-r from-[#152449] via-[#162443] to-[#102b33] p-6 shadow-lg shadow-slate-950/20 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-indigo-500/15 blur-3xl" />
        <Link to="/dashboard/my-subjects" className="relative mb-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 transition hover:text-white">
          <ChevronLeft size={16} /> Volver a mis cursos
        </Link>
        <div className="relative flex items-start gap-4">
          <div className="rounded-2xl border border-indigo-300/25 bg-indigo-400/15 p-3 text-indigo-200"><ClipboardCheck size={28} /></div>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles size={12} /> Seguimiento académico
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Resultados y notas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Consultá calificaciones, revisá cada respuesta y administrá el historial de las actividades de tus alumnos.</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de resultados">
        {[
          { label: 'Actividades realizadas', value: statistics.count, icon: ClipboardCheck, tone: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
          { label: 'Alumnos evaluados', value: statistics.students, icon: Users, tone: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
          { label: 'Puntaje promedio', value: `${statistics.score}%`, icon: TrendingUp, tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
          { label: 'Calificación promedio', value: gradeText(statistics.grade), icon: GraduationCap, tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
            <div className="flex items-center gap-2 text-xs font-medium"><card.icon size={16} /> {card.label}</div>
            <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-50">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-700/80 bg-[#101b2f]/90 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-200"><BookOpen size={17} className="text-indigo-300" /> Filtros del historial</div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400">Curso y materia</span>
            <div className={`${inputStyle} min-h-[46px] truncate border-indigo-500/30 bg-indigo-500/10 text-indigo-100`} title={assignment ? `${assignment.courseName} · ${assignment.subjectName}` : ''}>
              {assignment ? `${assignment.courseName} · ${assignment.subjectName} (${assignment.academicYear})` : 'Sin asignación autorizada'}
            </div>
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">Alumno
            <select className={`${inputStyle} cursor-pointer`} value={studentId} onChange={e => setStudentId(e.target.value)}>
              <option value="">Todos los alumnos</option>
              {students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">Buscar contenido
            <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className={`${inputStyle} pl-10`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Alumno, unidad, tema..." />
            </div>
          </label>
          <button type="button" onClick={loadAttempts} disabled={busy || !assignmentId} className={`${actionBase} h-[46px] border-indigo-500/40 bg-indigo-500/20 px-4 text-indigo-100 hover:bg-indigo-500/30`}>
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-800/45 px-3 py-2 text-xs font-medium text-slate-300">
          <input type="checkbox" className="accent-indigo-500" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} /> Incluir resultados archivados
        </label>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</p>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200"><CheckCircle2 size={18} /> {notice}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#101a2e]/95 shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/70 px-5 py-4">
          <div className="flex items-center gap-2 font-bold"><CalendarClock size={18} className="text-sky-300" /> Historial de actividades</div>
          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
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
      </section>

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
              <div className="flex items-start gap-2">{q.isCorrect ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-300" />}<div><p className="font-semibold">{i + 1}. {q.text}</p><p className={`mt-2 text-sm ${q.isCorrect ? 'text-emerald-200' : 'text-rose-200'}`}>{q.isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'} · Respondió: {describeAnswer(q.givenAnswer, q.options)}</p>{!q.isCorrect && <p className="mt-1 text-sm text-sky-200">Respuesta esperada: {describeAnswer(q.correctAnswer, q.options)}</p>}</div></div>
            </div>)}</div>}
        </div>
      </div>}

      {deleting && <div role="dialog" aria-modal="true" aria-label="Eliminar definitivamente" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/45 bg-[#151a2b] p-6 shadow-2xl">
          <div className="flex items-center gap-2 text-rose-300"><Trash2 size={22} /><h2 className="text-xl font-bold">Eliminar definitivamente</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300"><strong>{deleting.studentName}</strong> · {deleting.content}. Esta operación elimina el resultado y descuenta los puntos que otorgó; no se puede deshacer. Los intentos históricos sin puntos exactos no se pueden borrar automáticamente.</p>
          <label className="mt-4 block text-sm text-slate-200">Escribí <strong className="text-rose-300">BORRAR</strong> para confirmar
            <input className={`${inputStyle} mt-2`} value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="BORRAR" />
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className={`${actionBase} border-slate-600 text-slate-200 hover:bg-slate-700`} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className={`${actionBase} border-rose-500 bg-rose-600 text-white hover:bg-rose-500`} disabled={confirmText !== 'BORRAR'} onClick={remove}>Eliminar definitivamente</button></div>
        </div>
      </div>}
    </div>
  );
}
