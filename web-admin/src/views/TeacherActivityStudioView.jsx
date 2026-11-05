import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, FileText, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft, Upload, Gamepad2, RefreshCw, Save, Trash2, ClipboardCheck } from 'lucide-react';
import api from '../api/axios';
import { teacherSubjectService } from '../services/teacherSubject.service';
import { aiActivityService } from '../services/aiActivity.service';
import { unitService } from '../services/unit.service';

const types = [
  { value: 'true_false', label: 'Verdadero o falso', help: 'Afirmaciones para un juego de respuestas rápidas' },
  { value: 'multiple_choice', label: 'Opciones múltiples', help: 'Preguntas con cuatro opciones y una respuesta correcta' },
  { value: 'matching', label: 'Unir conceptos', help: 'El alumno vincula conceptos con definiciones.' },
  { value: 'sequence', label: 'Ordenar secuencias', help: 'Organizá pasos cronológicos o lógicos, por ejemplo un procedimiento.' },
  { value: 'classification', label: 'Clasificar conceptos', help: 'Asigná cada concepto a una categoría educativa.' },
  { value: 'fill_blank', label: 'Completar oraciones', help: 'Elegí la palabra que falta en cada oración.' },
  { value: 'spot_error', label: 'Encontrar el error', help: 'Detectá el fragmento incorrecto y revisá su explicación.' },
  { value: 'memory', label: 'Memotest de conceptos', help: 'Emparejá conceptos y definiciones con tarjetas que se descubren al tocarlas.' },

];
const CONTENT_KEYS = { true_false: 'statements', multiple_choice: 'questions', matching: 'pairs', sequence: 'steps', classification: 'items', fill_blank: 'sentences', spot_error: 'challenges', memory: 'pairs' };
const emptyRow = type => ({
  true_false: { text: '', correctAnswer: true },
  multiple_choice: { text: '', options: [1,2,3,4].map(i => ({ id: String(i), text: '' })), correctAnswer: '1' },
  matching: { left: '', right: '' },
  sequence: { text: '' },
  classification: { text: '', category: '' },
  fill_blank: { text: 'El ___ es ...', answer: '', wrongAnswers: ['', '', ''] },
  spot_error: { text: '', segments: ['', '', ''], incorrectIndex: 0, explanation: '' },
  memory: { left: '', right: '' },
})[type];
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
  const [difficulty, setDifficulty] = useState(5);
  const [geminiStatus, setGeminiStatus] = useState(null);
  const [gameType, setGameType] = useState('true_false');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generated, setGenerated] = useState(null);
  const [draft, setDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    aiActivityService.status().then(setGeminiStatus).catch(() => setGeminiStatus(null));
  }, []);

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
  const archiveActivity = activity => perform('archive', async () => {
    await aiActivityService.archive(activity.id, teacherSubjectId);
    setDeleteTarget(null);
    if (draft?.id === activity.id) { setDraft(null); setGenerated(null); }
    await refresh();
    setNotice('Actividad retirada de las unidades, temas y juegos disponibles. Las calificaciones anteriores se conservan.');
  });
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
      instructions, count: Number(count), gameType, difficulty,
    });
    setGenerated({ ...result.content, difficulty }); setDraft(null);
    setTitle(`${detail?.subject?.nombre || 'Materia'} · ${types.find(x => x.value === gameType)?.label}`);
    setDescription(instructions.trim().slice(0, 1500));
    setNotice('La IA generó las preguntas. Revisá las soluciones antes de guardar el borrador.');
  });
  const contentKey = CONTENT_KEYS[gameType];
  const rows = generated?.[contentKey] || [];
  const updateRow = (index, patch) => setGenerated(prev => ({
    ...prev, [contentKey]: (prev?.[contentKey] || []).map((row, i) => i === index ? { ...row, ...patch } : row),
  }));
  const removeRow = index => setGenerated(prev => ({
    ...prev, [contentKey]: (prev?.[contentKey] || []).filter((_, i) => i !== index),
  }));
  const addRow = () => setGenerated(prev => ({ ...prev, [contentKey]: [...(prev?.[contentKey] || []), emptyRow(gameType)] }));
  const moveSequence = (index, direction) => setGenerated(prev => {
    if (gameType !== 'sequence') return prev;
    const next = [...prev.steps];
    const target = index + direction;
    if (target < 0 || target >= next.length) return prev;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...prev, steps: next };
  });
  // Crear manualmente no consume cuota Gemini. El mismo validador Express verifica el borrador.
  const startManual = () => {
    if (!topicExists) { setError('Seleccioná primero un tema válido.'); return; }
    setGenerated({ difficulty, [contentKey]: Array.from({ length: 3 }, () => emptyRow(gameType)) });
    setTitle(`${detail?.subject?.nombre || 'Materia'} · ${types.find(t => t.value === gameType)?.label}`);
    setDescription(''); setDraft(null); setError('');
    setNotice('Completá los desafíos y las respuestas, guardá y publicá. Esta opción es gratuita y no usa IA.');
  };
  const save = () => perform('save', async () => {
    if (!topicExists) throw new Error('Elegí un tema válido de esta materia para la actividad.');
    if (!generated || !rows.length) throw new Error('Generá y revisá al menos una pregunta.');
    const result = draft
      ? await aiActivityService.editDraft(draft.id, { teacherSubjectId, topicId: Number(topicId), title, description, gameType, content: { ...generated, difficulty } })
      : await aiActivityService.saveDraft({ teacherSubjectId, topicId: Number(topicId), title, description, gameType, content: { ...generated, difficulty } });
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
          {<fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-200">Fuente de información</legend>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${sourceMode === 'text' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-600 bg-slate-800/70 hover:border-slate-400'}`}>
              <input type="radio" name="aiSource" value="text" checked={sourceMode === 'text'} onChange={() => changeSourceMode('text')} className="mt-1 accent-amber-400"/>
              <span><strong className="block">Sin PDF</strong><span className="text-xs text-slate-400">Crear solamente a partir de un tema y tus instrucciones.</span></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${sourceMode === 'pdf' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-600 bg-slate-800/70 hover:border-slate-400'}`}>
              <input type="radio" name="aiSource" value="pdf" checked={sourceMode === 'pdf'} onChange={() => changeSourceMode('pdf')} className="mt-1 accent-amber-400"/>
              <span><strong className="block">Utilizar PDF</strong><span className="text-xs text-slate-400">Generar usando un PDF de referencia que subís o ya cargaste.</span></span>
            </label>
          </fieldset>}
          <div className="mt-5 space-y-4">
            <div><label className={label}>Tema e instrucciones {sourceMode === 'text' ? '*' : '(opcionales si utilizás PDF)'}</label>
              <textarea className={`${field} min-h-28`} value={instructions} onChange={e => { setInstructions(e.target.value); setGenerated(null); setDraft(null); }} placeholder="Ej.: Sistema solar, 5.º grado. Priorizá rotación y traslación y usá lenguaje sencillo." maxLength={1500}/>
              {sourceMode === 'text' && <p className="mt-1 text-xs text-slate-400">Ingresá al menos 15 caracteres.</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className={label}>Tipo de juego</label><select className={field} value={gameType} onChange={e => { setGameType(e.target.value); setGenerated(null); setDraft(null); }}>{types.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div><label className={label}>Cantidad</label><select className={field} value={count} onChange={e => setCount(Number(e.target.value))}>{[3,5,8,10,15].map(num => <option key={num} value={num}>{num} {['matching','memory'].includes(gameType) ? 'parejas' : 'preguntas'}</option>)}</select></div>
            </div>
            <div className="rounded-xl border border-violet-500/40 bg-violet-950/40 p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><label htmlFor="game-difficulty" className="font-semibold text-white">Dificultad pedagógica</label><span aria-live="polite" className="rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-slate-900">{difficulty}/10 · {['','Muy fácil','Muy fácil','Fácil','Fácil','Intermedia','Intermedia','Difícil','Difícil','Muy difícil','Muy difícil'][difficulty]}</span></div>
              <input id="game-difficulty" aria-label="Dificultad de 1 a 10" type="range" min="1" max="10" step="1" value={difficulty} onChange={e => { const value = Number(e.target.value); setDifficulty(value); setGenerated(previous => previous ? { ...previous, difficulty: value } : previous); }} className="w-full cursor-pointer accent-amber-400" />
              <div className="mt-1 flex justify-between text-xs text-slate-300"><span>1 · Muy fácil</span><span>10 · Muy difícil</span></div>
              <p className="mt-2 text-xs text-slate-400">Gemini ajustará la complejidad al nivel elegido. En creación manual queda registrado para referencia docente. No cambia artificialmente la nota.</p>
            </div>
            <p className="text-xs text-slate-400">{types.find(x => x.value === gameType)?.help}. La IA puede consumir cuota de Gemini.</p>
            {geminiStatus && <p role="status" className={`rounded-lg px-3 py-2 text-xs ${geminiStatus.configured ? 'bg-emerald-950 text-emerald-200' : 'bg-amber-950 text-amber-200'}`}>{geminiStatus.configured ? `Gemini configurado en Express · ${geminiStatus.model}` : 'Gemini no configurado en backend/.env. Podés crear juegos manuales igualmente.'}</p>}
            <button type="button" disabled={disabled || !topicExists || (sourceMode === 'pdf' && !documentId)} onClick={generate} className={`${btn} w-full bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed`}><Sparkles size={18}/>{busy === 'generate' ? 'Generando preguntas...' : 'Generar preguntas con Gemini'}</button>
            <button type="button" onClick={startManual} disabled={disabled || !topicExists} className={`${btn} w-full border border-violet-400/60 text-violet-200 hover:bg-violet-500/10`}>Crear actividad manualmente (sin costo de IA)</button>
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
          {['true_false', 'multiple_choice', 'sequence', 'classification', 'fill_blank'].includes(gameType) && <><label className={label}>{gameType === 'sequence' ? 'Paso (posición correcta)' : gameType === 'fill_blank' ? 'Oración (escribí ___ donde falta la palabra)' : 'Enunciado'}</label><textarea className={field} value={item.text || ''} onChange={e => updateRow(i, { text: e.target.value })}/></>}
          {['matching', 'memory'].includes(gameType) && <div className="grid gap-3"><label className={label}>Concepto</label><input className={field} value={item.left || ''} onChange={e => updateRow(i, { left: e.target.value })}/><label className={label}>Definición vinculada</label><input className={field} value={item.right || ''} onChange={e => updateRow(i, { right: e.target.value })}/></div>}
          {gameType === 'sequence' && <div className="mt-3 flex gap-2"><button type="button" disabled={i === 0} onClick={() => moveSequence(i, -1)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm disabled:opacity-30">↑ Subir paso</button><button type="button" disabled={i === rows.length - 1} onClick={() => moveSequence(i, 1)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm disabled:opacity-30">↓ Bajar paso</button></div>}
          {gameType === 'classification' && <div className="mt-3"><label className={label}>Categoría correcta (utilizá entre 2 y 6 diferentes)</label><input className={field} value={item.category || ''} onChange={e => updateRow(i, { category: e.target.value })}/></div>}
          {gameType === 'fill_blank' && <div className="mt-3 space-y-3"><label className={label}>Palabra correcta</label><input className={field} value={item.answer || ''} onChange={e => updateRow(i, { answer: e.target.value })}/><label className={label}>Tres palabras incorrectas</label>{[0,1,2].map(j => <input key={j} className={field} value={(item.wrongAnswers || [])[j] || ''} placeholder={`Distractor ${j+1}`} onChange={e => { const wrongAnswers = [...(item.wrongAnswers || ['', '', ''])]; wrongAnswers[j] = e.target.value; updateRow(i, {wrongAnswers}); }}/>)}</div>}
          {gameType === 'spot_error' && <div className="mt-3 space-y-3"><label className={label}>Fragmentos entre los cuales buscar el error (3 a 6)</label>{(item.segments || []).map((seg,j) => <div key={j} className="flex items-center gap-2"><span className="text-slate-400">{j+1}.</span><input className={field} value={seg} onChange={e => updateRow(i, {segments:item.segments.map((v,k)=> k===j ? e.target.value:v)})}/></div>)}<label className={label}>Fragmento incorrecto</label><select className={field} value={item.incorrectIndex ?? 0} onChange={e => updateRow(i,{incorrectIndex:Number(e.target.value)})}>{(item.segments||[]).map((_,j)=><option key={j} value={j}>Fragmento {j+1}</option>)}</select><label className={label}>Explicación de la corrección</label><textarea className={field} value={item.explanation||''} onChange={e=>updateRow(i,{explanation:e.target.value})}/></div>}
          {gameType === 'true_false' && <div className="mt-3"><label className={label}>Respuesta correcta</label><select className={field} value={String(item.correctAnswer)} onChange={e => updateRow(i, { correctAnswer: e.target.value === 'true' })}><option value="true">Verdadero</option><option value="false">Falso</option></select></div>}
          {gameType === 'multiple_choice' && <div className="mt-3 space-y-3"><label className={label}>Opciones</label>{(item.options || []).map((o, j) => <div key={j} className="flex items-center gap-2"><span className="text-slate-400">{j+1}.</span><input className={field} value={o.text || ''} onChange={e => updateRow(i, { options: item.options.map((a,k) => k === j ? { ...a, text: e.target.value } : a) })}/></div>)}<label className={label}>Opción correcta</label><select className={field} value={String(item.correctAnswer || '1')} onChange={e => updateRow(i, { correctAnswer: e.target.value })}>{[1,2,3,4].map(n => <option value={String(n)} key={n}>Opción {n}</option>)}</select></div>}
        </article>)}</div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-700 pt-5"><button disabled={disabled || rows.length >= 15} onClick={addRow} className={`${btn} border border-slate-500 text-slate-200`}>+ Agregar desafío</button><button disabled={disabled || !topicExists} onClick={save} className={`${btn} bg-blue-600 text-white hover:bg-blue-500`}><Save size={17}/>{busy === 'save' ? 'Guardando...' : draft ? 'Guardar cambios del borrador' : 'Guardar como borrador'}</button><button disabled={disabled || !draft} onClick={publish} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}><CheckCircle2 size={17}/>{busy === 'publish' ? 'Publicando...' : 'Aprobar y publicar'}</button><button disabled={disabled} onClick={() => { setGenerated(null); setDraft(null); }} className={`${btn} border border-slate-600 text-slate-300`}>Cerrar borrador</button></div>
      </section>}
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Gamepad2 size={22} className="text-violet-300"/> 5. Actividades de esta materia</h2><button className="flex items-center gap-1 text-sm text-blue-300" onClick={() => perform('refresh', refresh)}><RefreshCw size={15}/> Actualizar</button></div>
        {(detail.activities || []).filter(a => a.status !== 'INACTIVE' && a.gameType !== 'image_label').length ? <div className="grid gap-3 sm:grid-cols-2">{(detail.activities || []).filter(a => a.status !== 'INACTIVE' && a.gameType !== 'image_label').map(a => <article key={a.id} className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{a.title}</p><p className="text-sm text-slate-400">{types.find(t => t.value === a.gameType)?.label || 'Juego no disponible'} · Dificultad {a.content?.difficulty ?? 5}/10</p></div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${a.status === 'ACTIVE' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>{a.status === 'ACTIVE' ? 'Publicada' : 'Borrador'}</span></div>
          <div className="flex flex-wrap gap-2">
            {a.status === 'DRAFT' && types.some(t => t.value === a.gameType) && <button className={`${btn} border border-sky-500/50 bg-sky-950/30 text-sky-200 text-sm`} onClick={() => { setGenerated(a.content); setDraft(a); setGameType(a.gameType); setDifficulty(a.content?.difficulty ?? 5); setTitle(a.title); setDescription(a.description || ''); setTopicId(a.topicId ? String(a.topicId) : ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Revisar y editar</button>}
            <Link to={`/dashboard/my-subjects/${teacherSubjectId}/results?activityId=${a.id}`} className={`${btn} border border-violet-400/40 bg-violet-600/20 text-violet-100 text-sm`}><ClipboardCheck size={16}/> Ver resultados</Link>
            <button type="button" onClick={() => setDeleteTarget(a)} className={`${btn} border border-rose-500/40 bg-rose-950/30 text-rose-200 text-sm`}><Trash2 size={16}/> Eliminar actividad</button>
          </div>
        </article>)}</div> : <p className="text-sm text-slate-400">Todavía no hay actividades vinculadas.</p>}
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-archive-title">
          <div className="w-full max-w-lg rounded-2xl border border-rose-400/50 bg-slate-900 p-6 shadow-2xl"><h3 id="confirm-archive-title" className="text-xl font-bold text-white">¿Eliminar esta actividad?</h3>
            <p className="mt-3 font-semibold text-rose-200">{deleteTarget.title}</p><p className="mt-2 text-sm text-slate-300">Desaparecerá de las unidades, temas y juegos de los alumnos. Las notas ya obtenidas se conservarán en el historial académico.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" disabled={disabled} onClick={() => setDeleteTarget(null)} className={`${btn} border border-slate-500 text-slate-100`}>Cancelar</button><button type="button" disabled={disabled} onClick={() => archiveActivity(deleteTarget)} className={`${btn} bg-rose-600 text-white hover:bg-rose-500`}><Trash2 size={16}/>{busy === 'archive' ? 'Eliminando...' : 'Sí, eliminar'}</button></div>
          </div>
        </div>}
        <p className="mt-4 text-xs text-slate-400">Los juegos publicados se corrigen en Express: Unity no recibe las soluciones.</p>
      </section>
    </div>
  );
}
