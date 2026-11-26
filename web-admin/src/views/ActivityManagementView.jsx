import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, LoaderCircle, Plus, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import QuizCreatorModal from '../components/QuizCreatorModal';
import { activityService } from '../services/activity.service';
import { assessmentService } from '../services/assessment.service';

const errorMessage = error => error?.response?.data?.message || error?.message || 'No se pudo completar la operación.';

export default function ActivityManagementView() {
  const [activities, setActivities] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [creator, setCreator] = useState(null);

  const loadData = useCallback(async (retry = false) => {
    if (retry === 'initial') await Promise.resolve();
    setError('');
    retry === true ? setIsRetrying(true) : setIsLoading(true);
    try {
      const [activityRows, assignmentRows] = await Promise.all([
        activityService.list(),
        assessmentService.assignments(),
      ]);
      setActivities(activityRows || []);
      setAssignments(assignmentRows || []);
      return activityRows || [];
    } catch (requestError) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    // The loader applies state only after its asynchronous requests settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData('initial').catch(() => {});
  }, [loadData]);

  const subjects = useMemo(() => [...new Map(assignments.map(item => [
    String(item.subjectId),
    { id: String(item.subjectId), name: item.subjectName },
  ])).values()], [assignments]);

  const subjectAssignments = useMemo(
    () => assignments.filter(item => String(item.subjectId) === String(selectedSubjectId) && item.isActive),
    [assignments, selectedSubjectId],
  );
  const quizActivities = useMemo(
    () => activities.filter(activity => ['TRIVIA', 'MULTIPLE_CHOICE'].includes(String(activity.gameType).toUpperCase())),
    [activities],
  );

  const openDetails = activity => {
    const assignedCourseIds = new Set((activity.ActivityCourse || []).map(item => String(item.courseId)));
    const matchingAssignments = assignments.filter(item => assignedCourseIds.has(String(item.courseId)));
    const inferredSubject = activity.teacherSubjectId
      ? assignments.find(item => String(item.id) === String(activity.teacherSubjectId))?.subjectId
      : matchingAssignments[0]?.subjectId;
    const nextSubjectId = inferredSubject == null ? '' : String(inferredSubject);
    setSelected(activity);
    setSelectedSubjectId(nextSubjectId);
    setSelectedAssignmentIds(
      matchingAssignments
        .filter(item => inferredSubject == null || String(item.subjectId) === String(inferredSubject))
        .map(item => String(item.id)),
    );
    setError('');
  };

  const closeDetails = () => {
    if (isSaving) return;
    setSelected(null);
    setError('');
  };

  const handleSaved = async savedActivity => {
    setCreator(null);
    setNotice('Borrador guardado. Elegí los cursos y publicalo cuando esté listo.');
    try {
      const rows = await loadData(true);
      const activity = rows.find(item => item.id === savedActivity?.id) || savedActivity;
      if (activity) openDetails(activity);
    } catch {
      if (savedActivity) openDetails(savedActivity);
    }
  };

  const toggleAssignment = id => {
    setSelectedAssignmentIds(current => current.includes(String(id))
      ? current.filter(item => item !== String(id))
      : [...current, String(id)]);
  };

  const publish = async () => {
    if (!selected || !selectedAssignmentIds.length) {
      setError('Seleccioná al menos un curso para publicar.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await activityService.publish(selected.id, selectedAssignmentIds.map(Number));
      setNotice('Actividad publicada y asignada a los cursos seleccionados.');
      setSelected(null);
      await loadData(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const unpublish = async () => {
    if (!selected) return;
    setIsSaving(true);
    setError('');
    try {
      await activityService.unpublish(selected.id);
      setNotice('Actividad despublicada.');
      setSelected(null);
      await loadData(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const editSelected = () => {
    if (selected?.status !== 'DRAFT') return;
    setCreator({ mode: 'edit', activity: selected });
    setSelected(null);
  };

  const statusLabel = status => status === 'ACTIVE' ? 'Publicada' : status === 'DRAFT' ? 'Borrador' : 'Inactiva';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div>
          <Link to="/dashboard/my-subjects" className="mb-3 inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
            <ArrowLeft size={16} /> Volver a mis materias
          </Link>
          <h1 className="text-2xl font-bold text-white">Actividades</h1>
          <p className="mt-1 text-sm text-slate-400">Creá cuestionarios, guardalos como borrador y asigná los cursos al publicarlos.</p>
        </div>
        <button type="button" onClick={() => setCreator({ mode: 'create', activity: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500">
          <Plus size={17} /> Nueva actividad
        </button>
      </header>

      {notice && <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        <span className="inline-flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span>
        <button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={16} /></button>
      </div>}

      {error && !selected && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-200">
        <span>{error}</span>
        <button type="button" disabled={isRetrying} onClick={() => loadData(true).catch(() => {})}
          className="inline-flex items-center gap-2 underline disabled:opacity-50"><RefreshCw size={15} className={isRetrying ? 'animate-spin' : ''} /> Reintentar</button>
      </div>}

      {isLoading ? <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-300"><LoaderCircle className="animate-spin" /> Cargando actividades...</div> : (
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
          <div className="border-b border-slate-700 px-5 py-4 font-bold">Listado de actividades</div>
          {quizActivities.length ? <div className="divide-y divide-slate-800">
            {quizActivities.map(activity => <article key={activity.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <BookOpen className="mt-1 shrink-0 text-blue-300" size={19} />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-white">{activity.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">Tipo de actividad: Trivia · {(activity.ActivityCourse || []).length} curso(s) asignado(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activity.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                  {statusLabel(activity.status)}
                </span>
                <button type="button" onClick={() => openDetails(activity)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  Ver detalle
                </button>
              </div>
            </article>)}
          </div> : <p className="p-8 text-center text-sm text-slate-400">Todavía no creaste actividades. Usá “Nueva actividad” para empezar.</p>}
        </section>
      )}

      {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#101b30] p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="activity-detail-title" className="text-xl font-bold">Detalle de la actividad</h2>
              <p className="mt-1 text-sm text-slate-400">{selected.title}</p></div>
            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">{statusLabel(selected.status)}</span>
          </div>
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">Tipo de actividad: Trivia</div>

          <div className="mt-5">
            <h3 className="font-semibold">Asignar cursos</h3>
            <label className="mt-3 block text-sm text-slate-300">Materia
              <select value={selectedSubjectId} onChange={event => {
                setSelectedSubjectId(event.target.value);
                setSelectedAssignmentIds([]);
              }} disabled={selected.status !== 'DRAFT'}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white disabled:opacity-60">
                <option value="">Seleccioná una materia</option>
                {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <div className="mt-3 max-h-48 divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-700">
              {subjectAssignments.map(assignment => <label key={assignment.id} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 text-sm text-slate-200">
                <span>{assignment.courseName}</span>
                <input type="checkbox" checked={selectedAssignmentIds.includes(String(assignment.id))}
                  disabled={selected.status !== 'DRAFT'}
                  onChange={() => toggleAssignment(assignment.id)} className="h-4 w-4 accent-blue-500" />
              </label>)}
              {!subjectAssignments.length && <p className="p-3 text-sm text-slate-400">Elegí una materia con cursos asignados.</p>}
            </div>
            <p className="mt-2 text-xs text-slate-400">Seleccioná los cursos que podrán ver esta actividad.</p>
          </div>

          {error && <div role="alert" className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            {selected.status === 'DRAFT' && <button type="button" onClick={editSelected} disabled={isSaving}
              className="mr-auto rounded-lg border border-blue-500/60 px-4 py-2 text-sm text-blue-200 disabled:opacity-50">Editar</button>}
            <button type="button" onClick={closeDetails} disabled={isSaving} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Volver / cerrar</button>
            {selected.status === 'DRAFT' && <button type="button" onClick={publish} disabled={isSaving || !selectedAssignmentIds.length}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? 'Publicando...' : 'Publicar'}
            </button>}
            {selected.status === 'ACTIVE' && <button type="button" onClick={unpublish} disabled={isSaving}
              className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm text-amber-200 disabled:opacity-50">
              {isSaving ? 'Guardando...' : 'Despublicar'}
            </button>}
          </div>
        </section>
      </div>}

      {creator && <QuizCreatorModal
        isOpen
        mode={creator.mode}
        activityId={creator.activity?.id}
        initialQuiz={creator.activity}
        onClose={() => setCreator(null)}
        onSaved={handleSaved}
      />}
    </div>
  );
}
