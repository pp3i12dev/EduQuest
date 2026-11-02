import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, FileText, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft, Upload, Gamepad2, RefreshCw, Save } from 'lucide-react';
import api from '../api/axios';
import { teacherSubjectService } from '../services/teacherSubject.service';
import { aiActivityService } from '../services/aiActivity.service';
import { unitService } from '../services/unit.service';

const types = [
  { value: 'true_false', label: 'Verdadero o falso', help: 'Afirmaciones para un juego de respuestas rápidas' },
  { value: 'multiple_choice', label: 'Opciones múltiples', help: 'Corre y aprende y futuros cuestionarios con cuatro opciones' },
  { value: 'matching', label: 'Unir conceptos', help: 'Juego evaluable: el alumno vincula cada concepto con una definición distinta' },
];
const fileLink = relative => {
  try {
    const base = new URL(api.defaults.baseURL || '/api', window.location.origin);
    return new URL(relative, base.origin).href;
  } catch { return relative; }
};
const emptyChanges = { deletedContentIds: [], renamedContents: [], activityIdsToAdd: [], activityIdsToRemove: [] };
const errorText = err => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message || err?.message || 'No se pudo completar la operación.';
  return status ? `Error HTTP ${status}: ${msg}` : msg;
};

export default function TeacherActivityStudioView() {
  const teacherSubjectId = Number(useParams().teacherSubjectId);
  const [query] = useSearchParams();
  const [units, setUnits] = useState([]);
  const [topicId, setTopicId] = useState(query.get('topicId') || '');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState([]);
  const [documentId, setDocumentId] = useState('');
  const [sourceMode, setSourceMode] = useState('text'); // text | pdf
  const [instructions, setInstructions] = useState('');
  const [count, setCount] = useState(8);
  const [gameType, setGameType] = useState('true_false');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generated, setGenerated] = useState(null);
  const [draft, setDraft] = useState(null);

  const refresh = async () => {
    const [data, unitRows] = await Promise.all([
      teacherSubjectService.getDetail(teacherSubjectId), unitService.list(teacherSubjectId),
    ]);
    setDetail(data); setUnits(unitRows);
  };
  useEffect(() => {
    let alive = true;
    Promise.allSettled([teacherSubjectService.getDetail(teacherSubjectId), unitService.list(teacherSubjectId)]).then(([assignment, planning]) => {
      if (!alive) return;
      if (assignment.status === 'fulfilled') setDetail(assignment.value);
      if (planning.status === 'fulfilled') setUnits(planning.value);
      const faults = [];
      if (assignment.status === 'rejected') faults.push(`GET /teacher-subjects/${teacherSubjectId}: ${errorText(assignment.reason)}`);
      if (planning.status === 'rejected') faults.push(`GET /units?teacherSubjectId=${teacherSubjectId}: ${errorText(planning.reason)}`);
      setError(faults.join(' | '));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [teacherSubjectId]);
  const perform = async (label, work) => {
    if (busy) return;
    setBusy(label); setError(''); setNotice('');
    try { await work(); } catch (err) { setError(errorText(err)); } finally { setBusy(''); }
  };
  const upload = () => perform('upload', async () => {
    if (sourceMode !== 'pdf') throw new Error('Elegí «Utilizar PDF» para cargar una fuente.');
    if (!files.length) throw new Error('Seleccioná un archivo PDF desde tu equipo.');
    if (files.some(f => f.size === 0 || f.size > 8 * 1024 * 1024 || !/\.pdf$/i.test(f.name))) {
      throw new Error('Para generar con Gemini, el PDF debe pesar hasta 8 MB y no estar vacío.');
    }
    // El endpoint PUT /teacher-subjects/:id espera multipart/form-data: files y changes.
    // La conexión Axios no debe imponer Content-Type: application/json para FormData.
    const beforeIds = new Set((detail.contents || []).map(doc => String(doc.id)));
    const result = await teacherSubjectService.save(teacherSubjectId, { files, changes: emptyChanges });
    const newPdf = (result?.contents || []).find(doc => !beforeIds.has(String(doc.id)) && doc.mimeType === 'application/pdf');
    setDetail(result);
    setFiles([]);
    setDocumentId(newPdf ? String(newPdf.id) : '');
    setNotice(newPdf
      ? `PDF «${newPdf.name}» cargado y seleccionado. Ya podés generar preguntas con esa fuente.`
      : 'PDF cargado. Elegí el documento en la lista antes de generar preguntas.');
  });
  const changeSourceMode = mode => {
    if (mode === sourceMode) return;
    setSourceMode(mode);
    setDocumentId('');
    setFiles([]);
    setGenerated(null);
    setDraft(null);
    setError('');
  };
  const generate = () => perform('generate', async () => {
    if (!topicExists) throw new Error('Seleccioná una unidad y un tema válido antes de generar preguntas.');
    if (sourceMode === 'pdf' && !documentId) {
      throw new Error('Para generar a partir de PDF, primero subí o elegí un documento de referencia.');
    }
    if (sourceMode === 'text' && instructions.trim().length < 15) {
      throw new Error('Escribí al menos 15 caracteres con instrucciones para Gemini.');
    }
    const result = await aiActivityService.preview({
      teacherSubjectId, topicId: Number(topicId),
      documentId: sourceMode === 'pdf' ? Number(documentId) : null,
      instructions, count: Number(count), gameType,
    });
    setGenerated(result.content); setDraft(null);
    setTitle(`${detail?.subject?.nombre || 'Materia'} · ${types.find(x => x.value === gameType)?.label}`);
    setDescription(instructions.trim().slice(0, 1500));
    setNotice('La IA generó las preguntas. Revisá las soluciones antes de guardar el borrador.');
  });
  const rows = generated ? (generated.statements || generated.questions || generated.pairs || []) : [];
  const updateRow = (index, patch) => setGenerated(prev => {
    const name = gameType === 'true_false' ? 'statements' : gameType === 'multiple_choice' ? 'questions' : 'pairs';
    return { ...prev, [name]: prev[name].map((row, i) => i === index ? { ...row, ...patch } : row) };
  });
  const removeRow = index => setGenerated(prev => {
    const name = gameType === 'true_false' ? 'statements' : gameType === 'multiple_choice' ? 'questions' : 'pairs';
    return { ...prev, [name]: prev[name].filter((_, i) => i !== index) };
  });
  const save = () => perform('save', async () => {
    if (!topicExists) throw new Error('Elegí un tema válido de esta materia para la actividad.');
    if (!generated || !rows.length) throw new Error('Generá y revisá al menos una pregunta.');
    const result = draft
      ? await aiActivityService.editDraft(draft.id, { teacherSubjectId, topicId: Number(topicId), title, description, gameType, content: generated })
      : await aiActivityService.saveDraft({ teacherSubjectId, topicId: Number(topicId), title, description, gameType, content: generated });
    setDraft(result); setNotice('Borrador guardado. No aparece todavía para alumnos.');
    await refresh();
  });
  const publish = () => perform('publish', async () => {
    if (!topicExists) throw new Error('El tema seleccionado ya no existe o no pertenece a esta materia.');
    if (!draft) throw new Error('Guardá primero el borrador.');
    await aiActivityService.publish(draft.id, teacherSubjectId);
    setNotice('¡Actividad publicada y vinculada a esta materia! Ya puede verse en Unity.');
    setGenerated(null); setDraft(null);
    await refresh();
  });
  const field = 'w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-blue-400';
  const label = 'mb-1.5 block text-sm font-semibold text-slate-200';
  const btn = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold disabled:opacity-50';
  const disabled = !!busy;
  const topicExists = units.some(unit => (unit.topics || []).some(t => String(t.id) === String(topicId)));
  if (loading) return <div className="p-8 text-slate-200">Cargando taller de actividades...</div>;
  if (!detail) return <div role="alert" className="space-y-3 p-8 text-rose-300"><p>{error || 'No se encontró la materia.'}</p><p className="text-sm text-slate-400">Verificá que tu backend esté actualizado, que Prisma Client haya sido regenerado y que los endpoints GET /teacher-subjects/:id y GET /units respondan sin error.</p><button onClick={() => window.location.reload()} className="rounded-lg border border-slate-500 px-3 py-2 text-white">Reintentar</button></div>;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-slate-100">
      <header className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 p-6 sm:p-8">
        <Link to={`/dashboard/my-subjects${detail.course?.id ? `?courseId=${detail.course.id}` : ''}`} className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"><ArrowLeft size={16}/> Mis cursos</Link>
        <div className="mt-4 flex flex-wrap items-center gap-3"><Sparkles className="text-amber-300"/><h1 className="text-2xl font-bold sm:text-3xl">Taller de actividades</h1></div>
        <p className="mt-2 text-slate-300">{detail.subject?.nombre} · {detail.course?.nombre}</p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">1. Elegí un tema. 2. Generá con IA, con o sin PDF. 3. Revisá las respuestas. 4. Guardá y publicá.</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-200"><AlertTriangle className="mr-2 inline" size={18}/>{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-emerald-200"><CheckCircle2 className="mr-2 inline" size={18}/>{notice}</div>}
      <section className="rounded-2xl border border-blue-500/30 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Paso 1 · Elegí el tema de esta actividad</h2>
          <Link to={`/dashboard/my-subjects/${teacherSubjectId}/units`} className="text-sm text-blue-300 underline">Organizar unidades, temas y lecturas</Link></div>
        <p className="mb-3 mt-2 text-sm text-slate-400">Materia: {detail.subject?.nombre} · Curso: {detail.course?.nombre}. No se pueden guardar actividades nuevas sin tema.</p>
        <select className="w-full rounded-xl border border-slate-600 bg-slate-800 p-3" value={topicId}
          onChange={e => { setTopicId(e.target.value); setGenerated(null); setDraft(null); }}>
          <option value="">Seleccioná unidad didáctica y tema</option>
          {units.flatMap(unit => (unit.topics || []).map(topic =>
            <option key={topic.id} value={topic.id}>{unit.title} → {topic.title}</option>))}
        </select>
        {!units.some(unit => (unit.topics || []).length) && <p className="mt-3 text-sm text-amber-300">Primero creá una unidad didáctica y al menos un tema.</p>}
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className={`rounded-2xl border border-amber-500/30 bg-slate-900 p-5 sm:p-6 ${sourceMode === 'text' ? 'lg:col-span-2' : ''}`}>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles size={22} className="text-amber-300"/> 2. Generar actividad con IA</h2>
          <p className="mt-2 text-sm text-slate-400">Elegí cómo querés proporcionar la información. El PDF es opcional y nunca se publica como material de lectura para alumnos.</p>
          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-200">Fuente de información</legend>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${sourceMode === 'text' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-600 bg-slate-800/70 hover:border-slate-400'}`}>
              <input type="radio" name="aiSource" value="text" checked={sourceMode === 'text'} onChange={() => changeSourceMode('text')} className="mt-1 accent-amber-400"/>
              <span><strong className="block">Sin PDF</strong><span className="text-xs text-slate-400">Crear solamente a partir de un tema y tus instrucciones.</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${sourceMode === 'pdf' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-600 bg-slate-800/70 hover:border-slate-400'}`}>
              <input type="radio" name="aiSource" value="pdf" checked={sourceMode === 'pdf'} onChange={() => changeSourceMode('pdf')} className="mt-1 accent-amber-400"/>
              <span><strong className="block">Utilizar PDF</strong><span className="text-xs text-slate-400">Generar usando un PDF de referencia que subís o ya cargaste.</span></span>
            </label>
          </fieldset>
          <div className="mt-5 space-y-4">
            <div><label className={label}>Tema e instrucciones {sourceMode === 'text' ? '*' : '(opcionales si utilizás PDF)'}</label>
              <textarea className={`${field} min-h-28`} value={instructions} onChange={e => { setInstructions(e.target.value); setGenerated(null); setDraft(null); }} placeholder="Ej.: Sistema solar, 5.º grado. Priorizá rotación y traslación y usá lenguaje sencillo." maxLength={1500}/>
              {sourceMode === 'text' && <p className="mt-1 text-xs text-slate-400">Ingresá al menos 15 caracteres.</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className={label}>Tipo de juego</label><select className={field} value={gameType} onChange={e => { setGameType(e.target.value); setGenerated(null); setDraft(null); }}>{types.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div><label className={label}>Cantidad</label><select className={field} value={count} onChange={e => setCount(Number(e.target.value))}>{[3,5,8,10,15].map(num => <option key={num} value={num}>{num} {gameType === 'matching' ? 'parejas' : 'preguntas'}</option>)}</select></div>
            </div>
            <p className="text-xs text-slate-400">{types.find(x => x.value === gameType)?.help}. La IA puede consumir cuota de Gemini.</p>
            <button type="button" disabled={disabled || !topicExists || (sourceMode === 'pdf' && !documentId)} onClick={generate} className={`${btn} w-full bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed`}><Sparkles size={18}/>{busy === 'generate' ? 'Generando preguntas...' : 'Generar preguntas con Gemini'}</button>
            {!topicExists && <p className="text-xs text-amber-300">Primero seleccioná un tema en el paso 1.</p>}
            {sourceMode === 'pdf' && !documentId && <p className="text-xs text-amber-300">Seleccioná o subí un PDF desde el panel de la derecha para habilitar la generación.</p>}
          </div>
        </div>
        {sourceMode === 'pdf' && <div className="rounded-2xl border border-sky-500/30 bg-slate-900 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen size={22} className="text-sky-300"/> PDF de referencia</h2>
          <p className="mt-2 text-sm text-slate-400">Este archivo se utiliza exclusivamente para generar preguntas. No se publica en Unity como material de estudio.</p>
          {(detail.contents || []).filter(doc => doc.mimeType === 'application/pdf').length > 0 && <div className="mt-5"><label className={label} htmlFor="source-document">Elegí un PDF ya cargado</label>
            <select id="source-document" value={documentId} onChange={e => { setDocumentId(e.target.value); setGenerated(null); setDraft(null); }} className={field}>
              <option value="">Seleccioná un documento...</option>
              {(detail.contents || []).filter(doc => doc.mimeType === 'application/pdf').map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
            </select>
            {documentId && <p className="mt-2 text-xs text-emerald-300">PDF seleccionado y listo para utilizar.</p>}
          </div>}
          <div className="mt-5 rounded-xl border border-dashed border-slate-600 bg-slate-800/55 p-4">
            <label className={label} htmlFor="new-pdf">O subir un PDF nuevo (máximo 8 MB para Gemini)</label>
            <input id="new-pdf" type="file" accept=".pdf,application/pdf" className="block w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm text-slate-200 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:font-semibold file:text-white" onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 1))}/>
            {!!files.length && <p className="mt-2 break-all text-xs text-slate-300">Archivo elegido: {files[0].name} ({(files[0].size / 1024 / 1024).toFixed(2)} MB)</p>}
            <button type="button" disabled={disabled || !files.length} onClick={upload} className={`${btn} mt-3 w-full bg-sky-600 text-white hover:bg-sky-500 disabled:cursor-not-allowed`}><Upload size={17}/>{busy === 'upload' ? 'Subiendo PDF...' : 'Cargar PDF para Gemini'}</button>
            <p className="mt-2 text-xs text-slate-400">Primero elegí el archivo; después pulsá «Cargar PDF». Cuando termina la subida, quedará seleccionado para generar.</p>
          </div>
          {!!(detail.contents || []).length && <details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer">Ver documentos de esta materia</summary>
            <ul className="mt-3 space-y-2">{(detail.contents || []).filter(doc => doc.mimeType === 'application/pdf').map(doc => <li className="flex items-center gap-2" key={doc.id}><FileText size={13}/><span className="min-w-0 flex-1 truncate">{doc.name}</span><a className="cursor-pointer text-sky-300 underline" href={fileLink(doc.url)} target="_blank" rel="noreferrer">Abrir</a></li>)}</ul>
          </details>}
        </div>}
      </section>
      {generated && <section className="space-y-5 rounded-2xl border border-violet-500/30 bg-slate-900 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">3. Revisión docente</h2><p className="mt-1 text-sm text-slate-400">La IA puede equivocarse. Revisá especialmente la solución de cada pregunta antes de publicar.</p></div><span className="rounded-full bg-violet-500/20 px-3 py-1 text-sm text-violet-200">{rows.length} propuestas</span></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>Título de actividad</label><input className={field} value={title} onChange={e => setTitle(e.target.value)} maxLength={120}/></div><div><label className={label}>Descripción</label><input className={field} value={description} onChange={e => setDescription(e.target.value)} maxLength={1500}/></div></div>
        <div className="grid gap-4 lg:grid-cols-2">{rows.map((item, i) => <article className="rounded-xl border border-slate-700 bg-slate-800/80 p-4" key={i}>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Pregunta {i + 1}</h3><button className="text-sm text-rose-300 hover:underline" onClick={() => removeRow(i)} >Descartar</button></div>
          {gameType !== 'matching' ? <><label className={label}>Enunciado</label><textarea className={field} value={item.text || ''} onChange={e => updateRow(i, { text: e.target.value })} /></> : <div className="grid gap-3"><label className={label}>Concepto</label><input className={field} value={item.left || ''} onChange={e => updateRow(i, { left: e.target.value })} /><label className={label}>Definición vinculada</label><input className={field} value={item.right || ''} onChange={e => updateRow(i, { right: e.target.value })} /></div>}
          {gameType === 'true_false' && <div className="mt-3"><label className={label}>Respuesta correcta</label><select className={field} value={String(item.correctAnswer)} onChange={e => updateRow(i, { correctAnswer: e.target.value === 'true' })}><option value="true">Verdadero</option><option value="false">Falso</option></select></div>}
          {gameType === 'multiple_choice' && <div className="mt-3 space-y-3"><label className={label}>Opciones</label>{(item.options || []).map((o, j) => <div key={j} className="flex items-center gap-2"><span className="text-slate-400">{j+1}.</span><input className={field} value={o.text || ''} onChange={e => updateRow(i, { options: item.options.map((a,k) => k === j ? { ...a, text: e.target.value } : a) })}/></div>)}<label className={label}>Opción correcta</label><select className={field} value={String(item.correctAnswer || '1')} onChange={e => updateRow(i, { correctAnswer: e.target.value })}>{[1,2,3,4].map(n => <option value={String(n)} key={n}>Opción {n}</option>)}</select></div>}
        </article>)}</div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-700 pt-5"><button disabled={disabled || !topicExists} onClick={save} className={`${btn} bg-blue-600 text-white hover:bg-blue-500`}><Save size={17}/>{busy === 'save' ? 'Guardando...' : draft ? 'Guardar cambios del borrador' : 'Guardar como borrador'}</button><button disabled={disabled || !draft} onClick={publish} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}><CheckCircle2 size={17}/>{busy === 'publish' ? 'Publicando...' : 'Aprobar y publicar'}</button><button disabled={disabled} onClick={() => { setGenerated(null); setDraft(null); }} className={`${btn} border border-slate-600 text-slate-300`}>Cerrar borrador</button></div>
      </section>}
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Gamepad2 size={22} className="text-violet-300"/> 5. Actividades de esta materia</h2><button className="flex items-center gap-1 text-sm text-blue-300" onClick={() => perform('refresh', refresh)}><RefreshCw size={15}/> Actualizar</button></div>
        {(detail.activities || []).length ? <div className="grid gap-3 sm:grid-cols-2">{detail.activities.map(a => <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4"><div><p className="font-semibold">{a.title}</p>{a.status === 'DRAFT' && <button className="text-sm text-blue-300 underline" onClick={() => { setGenerated(a.content); setDraft(a); setGameType(a.gameType); setTitle(a.title); setDescription(a.description || ''); setTopicId(a.topicId ? String(a.topicId) : ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Revisar y editar</button>}<p className="text-sm text-slate-400">{types.find(t => t.value === a.gameType)?.label || a.gameType}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.status === 'ACTIVE' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>{a.status === 'ACTIVE' ? 'Publicada' : a.status === 'DRAFT' ? 'Borrador' : a.status}</span></div>)}</div> : <p className="text-sm text-slate-400">Todavía no hay actividades vinculadas.</p>}
        <p className="mt-4 text-xs text-slate-400">Verdadero/falso, opciones múltiples y unir conceptos se corrigen en Express; la solución no se envía a Unity. Corre y aprende sigue en práctica, sin nota.</p>
      </section>
    </div>
  );
}
