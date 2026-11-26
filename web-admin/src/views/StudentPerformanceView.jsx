import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Award, BookOpen, CheckCircle2, Clock3, LoaderCircle, RefreshCw, Save, TrendingUp } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { assessmentService } from '../services/assessment.service';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-700 bg-[#101b30] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400';
const errorText = error => error?.response?.data?.message || error?.message || 'No se pudo completar la operación.';

const formatDate = value => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value));

const formatDuration = seconds => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')} min`;
};

export default function StudentPerformanceView() {
  const { studentId } = useParams();
  const [loadedData, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ teacherSubjectId: '', grade: '', observations: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const data = String(loadedData?.student?.id) === String(studentId) ? loadedData : null;

  const loadPerformance = useCallback(async (fromEffect = false) => {
    if (fromEffect) await Promise.resolve();
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await assessmentService.performance(studentId, {
        ...(subjectFilter ? { teacherSubjectId: subjectFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setData(result);
      setForm(current => ({
        ...current,
        teacherSubjectId: current.teacherSubjectId ||
          (subjectFilter && result.subjects.some(item => String(item.id) === subjectFilter)
            ? subjectFilter : ''),
      }));
    } catch (requestError) {
      setLoadError(errorText(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [studentId, subjectFilter, statusFilter]);

  useEffect(() => {
    // The loader applies state only after its asynchronous request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPerformance(true);
  }, [loadPerformance]);

  const validate = () => {
    const errors = {};
    if (!form.teacherSubjectId) errors.teacherSubjectId = 'Seleccioná una materia.';
    const grade = Number(form.grade);
    if (form.grade === '' || !Number.isFinite(grade) || grade < 0 || grade > 10) {
      errors.grade = 'Ingresá una calificación válida entre 0 y 10.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveEvaluation = async event => {
    event?.preventDefault();
    setNotice('');
    setSaveError('');
    if (!validate()) return;
    setIsSaving(true);
    try {
      await assessmentService.createManualEvaluation(studentId, {
        teacherSubjectId: Number(form.teacherSubjectId),
        grade: Number(form.grade),
        observations: form.observations.trim(),
      });
      setForm({ teacherSubjectId: subjectFilter || '', grade: '', observations: '' });
      setFieldErrors({});
      setNotice('Evaluación cargada correctamente.');
      await loadPerformance();
    } catch (requestError) {
      setSaveError(errorText(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const formatAverage = value => value == null ? '—' : `${Number(value).toFixed(2).replace('.', ',')} / 10`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-12 text-slate-100">
      <header className="rounded-2xl border border-indigo-400/25 bg-gradient-to-r from-[#152449] to-[#102b33] p-5 sm:p-6">
        <Link to="/dashboard/students" className="mb-4 inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-white">
          <ArrowLeft size={16} /> Volver
        </Link>
        {isLoading && !data ? <div className="flex items-center gap-3 text-slate-300"><LoaderCircle className="animate-spin" /> Cargando desempeño...</div> : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Desempeño individual</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{data?.student?.name || 'Alumno'}</h1>
            <p className="mt-1 text-sm text-slate-300">{(data?.student?.courses || []).join(' · ') || 'Sin curso asociado'}</p>
          </>
        )}
      </header>

      {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
        <span>{loadError}</span>
        <button type="button" onClick={loadPerformance} disabled={isLoading} className="inline-flex items-center gap-2 underline disabled:opacity-50">
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Reintentar
        </button>
      </div>}

      {data && <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Resumen del alumno">
          {[
            { label: 'Nivel actual', value: data.student.level, Icon: Award },
            { label: 'Puntos totales', value: data.student.points, Icon: TrendingUp },
            { label: 'Completadas', value: data.summary.completed, Icon: CheckCircle2 },
            { label: 'En progreso', value: data.summary.inProgress, Icon: Clock3 },
            { label: 'Puntaje promedio', value: formatAverage(data.summary.averageGrade), Icon: BookOpen },
          ].map(item => <article key={item.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="flex items-center gap-2 text-xs text-slate-400"><item.Icon size={15} />{item.label}</p>
            <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
          </article>)}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Filtrar historial</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-300">Materia
              <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className={fieldClass}>
                <option value="">Todas las materias</option>
                {data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name} · {subject.courseName}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-300">Estado
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={fieldClass}>
                <option value="">Todos</option>
                <option value="COMPLETED">Completada</option>
                <option value="IN_PROGRESS">En progreso</option>
              </select>
            </label>
          </div>
        </section>

        {isLoading && <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={16} className="animate-spin" /> Actualizando datos...</div>}

        {!data.hasRecords ? <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center text-slate-300">
          Este alumno todavía no tiene desempeño registrado
        </div> : <>
          <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
            <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Historial de intentos</h2></div>
            {data.attempts.length ? <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-800/60 text-xs text-slate-400"><tr>
                  {['Actividad', 'Materia', 'Puntaje', 'Tiempo', 'Fecha', 'Estado'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-800">{data.attempts.map(attempt => <tr key={attempt.id}>
                  <td className="px-4 py-3 font-medium text-white">{attempt.activityTitle}</td>
                  <td className="px-4 py-3 text-slate-300">{attempt.subjectName}</td>
                  <td className="px-4 py-3">{attempt.isCompleted ? `${attempt.score}%` : '—'}</td>
                  <td className="px-4 py-3">{formatDuration(attempt.durationSeconds)}</td>
                  <td className="px-4 py-3">{formatDate(attempt.date)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${attempt.isCompleted ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                    {attempt.isCompleted ? 'Completada' : 'En progreso'}
                  </span></td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="p-5 text-sm text-slate-400">No hay intentos para los filtros seleccionados.</p>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
            <div className="border-b border-slate-700 px-5 py-4"><h2 className="font-bold">Evaluaciones manuales</h2></div>
            {data.evaluations.length ? <div className="divide-y divide-slate-800">
              {data.evaluations.map(evaluation => <article key={evaluation.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div><p className="font-semibold">{evaluation.subjectName} · {evaluation.courseName}</p>
                  {evaluation.observations && <p className="mt-1 text-sm text-slate-400">{evaluation.observations}</p>}</div>
                <div className="text-right"><p className="font-bold text-white">{Number(evaluation.grade).toFixed(2).replace('.', ',')} / 10</p>
                  <time className="text-xs text-slate-400">{formatDate(evaluation.date)}</time></div>
              </article>)}
            </div> : <p className="p-5 text-sm text-slate-400">Todavía no hay evaluaciones manuales.</p>}
          </section>
        </>}

        <section className="rounded-2xl border border-indigo-400/25 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">+ Cargar evaluación</h2>
          <form onSubmit={saveEvaluation} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">Materia <span className="text-rose-300">*</span>
              <select value={form.teacherSubjectId} onChange={event => {
                setForm(current => ({ ...current, teacherSubjectId: event.target.value }));
                setFieldErrors(current => ({ ...current, teacherSubjectId: '' }));
              }} aria-invalid={Boolean(fieldErrors.teacherSubjectId)} className={`${fieldClass} ${fieldErrors.teacherSubjectId ? 'border-rose-400' : ''}`}>
                <option value="">Seleccioná una materia</option>
                {data.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name} · {subject.courseName}</option>)}
              </select>
              {fieldErrors.teacherSubjectId && <span className="mt-1 block text-xs text-rose-300">{fieldErrors.teacherSubjectId}</span>}
            </label>
            <label className="text-sm text-slate-300">Calificación (0 a 10) <span className="text-rose-300">*</span>
              <input type="number" min="0" max="10" step="0.01" value={form.grade}
                onChange={event => {
                  setForm(current => ({ ...current, grade: event.target.value }));
                  setFieldErrors(current => ({ ...current, grade: '' }));
                }} aria-invalid={Boolean(fieldErrors.grade)} className={`${fieldClass} ${fieldErrors.grade ? 'border-rose-400' : ''}`} />
              {fieldErrors.grade && <span className="mt-1 block text-xs text-rose-300">{fieldErrors.grade}</span>}
            </label>
            <label className="text-sm text-slate-300 sm:col-span-2">Observaciones
              <textarea rows={3} maxLength={2000} value={form.observations}
                onChange={event => setForm(current => ({ ...current, observations: event.target.value }))}
                placeholder="Aclaración sobre qué se evaluó (opcional)" className={fieldClass} />
            </label>
            {notice && <p role="status" className="text-sm text-emerald-300 sm:col-span-2">{notice}</p>}
            {saveError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200 sm:col-span-2">
              <span>{saveError}</span>
              <button type="button" onClick={() => saveEvaluation()} disabled={isSaving} className="underline disabled:opacity-50">Reintentar</button>
            </div>}
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
                {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Guardando...' : 'Guardar evaluación'}
              </button>
            </div>
          </form>
        </section>
      </>}
    </div>
  );
}
