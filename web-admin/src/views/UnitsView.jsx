import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, FilePlus2, FolderOpen, Gamepad2, Layers3, Pencil, Plus, Sparkles, Upload, AlertCircle, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { useUnits } from '../hooks/useUnits';
import { useTeacherSubjectDetail } from '../hooks/useTeacherSubject';
import { unitService } from '../services/unit.service';
import { studyMaterialService } from '../services/studyMaterial.service';
import UnitFormModal from '../components/UnitFormModal';

const surface = 'rounded-2xl border border-slate-700 bg-slate-900/90 p-5 sm:p-6';
const input = 'mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400';
const button = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-400 hover:text-blue-200 disabled:opacity-50';
const topicPalette = [
  'border-violet-500/45 bg-violet-950/35',
  'border-amber-500/45 bg-amber-950/30',
  'border-emerald-500/45 bg-emerald-950/30',
  'border-sky-500/45 bg-sky-950/30',
  'border-rose-500/45 bg-rose-950/25',
];
const message = error => error?.response?.data?.message || error?.message || 'Ocurrió un problema al procesar la solicitud.';

export default function UnitsView() {
  const teacherSubjectId = Number(useParams().teacherSubjectId);
  const qc = useQueryClient();
  const { data: detail, isLoading: loadingDetail, isError: detailError, error: detailCause } = useTeacherSubjectDetail(teacherSubjectId);
  const { data: units = [], isLoading, isError, error: unitCause } = useUnits(teacherSubjectId);
  const materialQuery = useQuery({ queryKey: ['study-materials', teacherSubjectId], queryFn: () => studyMaterialService.list(teacherSubjectId), enabled: Number.isSafeInteger(teacherSubjectId) && teacherSubjectId > 0 });
  const materials = materialQuery.data || [];
  const [unitModal, setUnitModal] = useState(false);
  const [newTopicUnit, setNewTopicUnit] = useState(null);
  const [editing, setEditing] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicPosition, setTopicPosition] = useState(1);
  const [materialTopicId, setMaterialTopicId] = useState(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [publishOnUpload, setPublishOnUpload] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [movingTopicId, setMovingTopicId] = useState(null);

  const reload = () => { qc.invalidateQueries({ queryKey: ['units', teacherSubjectId] }); qc.invalidateQueries({ queryKey: ['study-materials', teacherSubjectId] }); };
  const topicMutation = useMutation({
    mutationFn: payload => editing ? unitService.updateTopic({ ...payload, unitId: editing.unitId, topicId: editing.id }) : unitService.createTopic({ ...payload, unitId: newTopicUnit }),
    onSuccess: () => { reload(); setNewTopicUnit(null); setEditing(null); setNotice('Tema guardado correctamente.'); },
    onError: e => setError(message(e)),
  });
  const topicModalOpen = newTopicUnit !== null || editing !== null;
  const startTopic = (unitId, topic = null) => {
    setError('');
    setEditing(topic ? { ...topic, unitId } : null);
    setNewTopicUnit(topic ? null : unitId);
    const siblings = units.find(u => u.id === unitId)?.topics || [];
    const currentPosition = topic ? siblings.findIndex(t => t.id === topic.id) + 1 : siblings.length + 1;
    setTopicTitle(topic?.title || '');
    setTopicDescription(topic?.description || '');
    setTopicPosition(Math.max(1, currentPosition));
  };
  const saveTopic = e => {
    e.preventDefault(); setError('');
    if (!topicTitle.trim()) { setError('Ingresá un título para el tema.'); return; }
    topicMutation.mutate({ title: topicTitle.trim(), description: topicDescription.trim(), position: Number(topicPosition) });
  };
  const moveTopic = async (unitId, topic, newPosition) => {
    if (movingTopicId !== null || busy || topicMutation.isPending) return;
    setMovingTopicId(topic.id); setError(''); setNotice('');
    try {
      await unitService.updateTopic({ unitId, topicId: topic.id, title: topic.title, description: topic.description || '', position: newPosition });
      await qc.invalidateQueries({ queryKey: ['units', teacherSubjectId] });
      setNotice(`«${topic.title}» ahora ocupa la posición ${newPosition}. Los otros temas se renumeraron automáticamente.`);
    } catch (e) { setError(message(e)); }
    finally { setMovingTopicId(null); }
  };
  const modalUnitId = editing?.unitId ?? newTopicUnit;
  const topicCount = units.find(u => u.id === modalUnitId)?.topics?.length || 0;
  const maxTopicPosition = Math.max(1, editing ? topicCount : topicCount + 1);

  const upload = async e => {
    e.preventDefault(); setError(''); setNotice('');
    if (!materialFile) { setError('Seleccioná un documento.'); return; }
    const filename = materialFile.name.toLowerCase();
    if (!/\.(pdf|doc|docx)$/.test(filename) || materialFile.size > 10 * 1024 * 1024) { setError('Elegí un PDF o Word de hasta 10 MB.'); return; }
    setBusy(true);
    try {
      await studyMaterialService.create({ teacherSubjectId, topicId: materialTopicId, title: materialTitle.trim() || materialFile.name, isPublished: publishOnUpload, file: materialFile });
      reload(); setMaterialTopicId(null); setMaterialTitle(''); setMaterialFile(null); setPublishOnUpload(false);
      setNotice('Material de lectura cargado. Su publicación se controla independientemente de los PDF para Gemini.');
    } catch(e) { setError(message(e)); } finally { setBusy(false); }
  };
  const togglePublication = async material => {
    setError(''); setNotice(''); setBusy(true);
    try { await studyMaterialService.publish(material.id, !material.isPublished); reload(); setNotice(material.isPublished ? 'Material ocultado para alumnos.' : 'Material publicado para alumnos.'); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const download = async material => { setError(''); try { await studyMaterialService.download(material); } catch(e) { setError(message(e)); } };

  if (!Number.isSafeInteger(teacherSubjectId) || teacherSubjectId <= 0) return <p className="p-6 text-rose-300">Asignación docente inválida.</p>;
  return <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-slate-100">
    <header className={surface}>
      <Link to={`/dashboard/my-subjects${detail?.course?.id ? `?courseId=${detail.course.id}` : ''}`} className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"><ArrowLeft size={16}/> Volver a las materias del curso</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Layers3 className="text-blue-300"/><h1 className="text-2xl font-bold">Planificación de la materia</h1></div><p className="mt-2 text-sm text-slate-400">{detail?.course?.nombre || 'Curso'} · {detail?.subject?.nombre || 'Materia'} · Unidades didácticas → temas → actividades y lecturas</p></div>
        <button onClick={() => setUnitModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500"><Plus size={17}/> Nueva unidad didáctica</button></div>
      <p className="mt-3 text-sm text-slate-400">Las actividades se crean dentro de cada tema. Los documentos de lectura se publican de forma independiente de los PDF usados como fuente de IA.</p>
    </header>
    {(isError || detailError || materialQuery.isError || error) && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200"><AlertCircle size={18} className="shrink-0"/><span>{error || message(unitCause || detailCause || materialQuery.error)}</span><button type="button" className="ml-auto underline" onClick={() => { setError(''); reload(); }}>Reintentar</button></div>}
    {notice && <p role="status" className="rounded-xl border border-emerald-600/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</p>}
    {(isLoading || loadingDetail || materialQuery.isLoading) && <p className="p-4 text-sm text-slate-400">Cargando planificación...</p>}
    {!isLoading && !isError && !units.length && <div className={surface}><FolderOpen className="mb-3 text-blue-300" size={32}/><h2 className="font-bold">Todavía no hay unidades didácticas</h2><p className="mt-2 text-sm text-slate-400">Creá una unidad y luego agregá temas. Los juegos se vinculan al tema desde «Generar actividad».</p></div>}
    {units.map((unit, index) => <section key={unit.id} className={`${surface} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-300">Unidad didáctica {index + 1}</p><h2 className="text-xl font-bold">{unit.title}</h2>{unit.description && <p className="mt-1 text-sm text-slate-400">{unit.description}</p>}</div><button type="button" className={button} onClick={() => startTopic(unit.id)}><Plus size={16}/> Agregar tema</button></div>
      {!unit.topics?.length && <p className="rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-400">Esta unidad todavía no tiene temas. Agregá uno para organizar las actividades y lecturas.</p>}
      <div className="grid gap-4">{(unit.topics || []).map((topic, topicIndex) => {
        const docs = materials.filter(m => Number(m.topicId) === Number(topic.id));
        const games = topic.activities || [];
        return <article key={topic.id} className={`rounded-xl border p-4 shadow-sm sm:p-5 ${topicPalette[topicIndex % topicPalette.length]}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/45 px-3 py-1 text-xs font-bold tracking-wide text-slate-200"><GripVertical size={13}/> Tema {topicIndex + 1}</span><h3 className="mt-2 text-lg font-bold">{topic.title}</h3>{topic.description && <p className="mt-1 text-sm text-slate-300">{topic.description}</p>}</div><div className="flex flex-wrap items-center gap-2"><button type="button" title="Subir un puesto" aria-label={`Subir ${topic.title}`} disabled={topicIndex === 0 || movingTopicId !== null || topicMutation.isPending} className={button} onClick={() => moveTopic(unit.id, topic, topicIndex)}><ArrowUp size={15}/></button><button type="button" title="Bajar un puesto" aria-label={`Bajar ${topic.title}`} disabled={topicIndex === unit.topics.length - 1 || movingTopicId !== null || topicMutation.isPending} className={button} onClick={() => moveTopic(unit.id, topic, topicIndex + 2)}><ArrowDown size={15}/></button><button type="button" className={button} onClick={() => startTopic(unit.id, topic)}><Pencil size={14}/> Editar tema</button></div></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"><h4 className="flex items-center gap-2 font-semibold"><Gamepad2 size={17} className="text-violet-300"/> Actividades ({games.length})</h4>
            {games.length ? <ul className="mt-3 space-y-2">{games.map(g => <li className="text-sm text-slate-300" key={g.id}>• {g.title} <span className="text-xs text-slate-500">({g.status})</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-400">Sin actividades.</p>}
            <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:underline" to={`/dashboard/my-subjects/${teacherSubjectId}/studio?topicId=${topic.id}`}><Sparkles size={15}/> Generar actividad en este tema</Link>
          </div><div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"><h4 className="flex items-center gap-2 font-semibold"><BookOpen size={17} className="text-emerald-300"/> Material de estudio ({docs.length})</h4>
            {docs.length ? <ul className="mt-3 space-y-3">{docs.map(doc => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0 break-words text-slate-300">{doc.title}<span className={`ml-2 text-xs ${doc.isPublished ? 'text-emerald-300' : 'text-amber-300'}`}>{doc.isPublished ? 'Publicado' : 'Borrador'}</span></span><span className="flex gap-2"><button disabled={busy} className="text-blue-300 underline" onClick={() => download(doc)}>Descargar</button><button disabled={busy} className="text-blue-300 underline" onClick={() => togglePublication(doc)}>{doc.isPublished ? 'Ocultar' : 'Publicar'}</button></span></li>)}</ul> : <p className="mt-2 text-sm text-slate-400">Sin lecturas cargadas.</p>}
            <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:underline" onClick={() => { setMaterialTopicId(topic.id); setMaterialTitle(''); setMaterialFile(null); setPublishOnUpload(false); }}><FilePlus2 size={15}/> Subir lectura</button>
          </div></div>
        </article>;
      })}</div>
    </section>)}
    {unitModal && <UnitFormModal teacherSubjectId={teacherSubjectId} onClose={() => setUnitModal(false)} />}
    {topicModalOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"><form onSubmit={saveTopic} role="dialog" aria-modal="true" aria-label="Tema de la unidad" className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <div><h2 className="text-xl font-bold">{editing ? 'Editar tema' : 'Nuevo tema'}</h2><p className="mt-1 text-sm text-slate-400">El tema pertenece a una unidad didáctica; las actividades se crean después, desde el taller de IA.</p></div>
      <label className="block text-sm font-semibold">Título *<input required maxLength={120} value={topicTitle} onChange={e => setTopicTitle(e.target.value)} className={input}/></label>
      <label className="block text-sm font-semibold">Descripción<textarea rows={3} maxLength={1500} value={topicDescription} onChange={e => setTopicDescription(e.target.value)} className={input}/></label>
      <label className="block text-sm font-semibold">Posición dentro de la unidad
        <select value={topicPosition} onChange={e => setTopicPosition(Number(e.target.value))} className={input}>
          {Array.from({ length: maxTopicPosition }, (_, i) => i + 1).map(pos => <option key={pos} value={pos}>{pos}{pos === maxTopicPosition && !editing ? ' · Al final (recomendado)' : ''}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-400">Los temas comienzan en 1. Si cambiás la posición, EduQuest desplaza y renumera automáticamente los demás, sin modificar sus actividades ni materiales.</p>
      {error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" className={button} onClick={() => { setNewTopicUnit(null); setEditing(null); setError(''); }}>Cancelar</button><button disabled={topicMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50">{topicMutation.isPending ? 'Guardando...' : 'Guardar tema'}</button></div>
    </form></div>}
    {materialTopicId !== null && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"><form onSubmit={upload} role="dialog" aria-modal="true" aria-label="Subir material de lectura" className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <div><h2 className="flex items-center gap-2 text-xl font-bold"><Upload size={20}/> Nuevo material de estudio</h2><p className="mt-1 text-sm text-slate-400">Se mostrará en Unity solo si lo publicás. No se utilizará automáticamente como fuente de Gemini.</p></div>
      <label className="block text-sm font-semibold">Título visible para el alumno<input maxLength={150} value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} className={input} placeholder="Ej. Guía de lectura: flexibilidad"/></label>
      <label className="block text-sm font-semibold">Documento (PDF, DOC o DOCX, hasta 10 MB) *<input required type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={e => setMaterialFile(e.target.files?.[0] || null)} className={`${input} text-sm`}/></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={publishOnUpload} onChange={e => setPublishOnUpload(e.target.checked)}/> Publicar inmediatamente para alumnos del curso</label>
      {error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" className={button} onClick={() => { setMaterialTopicId(null); setError(''); }} disabled={busy}>Cancelar</button><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold disabled:opacity-50">{busy ? 'Subiendo...' : 'Guardar material'}</button></div>
    </form></div>}
  </div>;
}
