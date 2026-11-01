import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, FileText, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft, Upload, Gamepad2, RefreshCw, Save } from 'lucide-react';
import api from '../api/axios';
import { teacherSubjectService } from '../services/teacherSubject.service';
import { aiActivityService } from '../services/aiActivity.service';

const types = [
  { value: 'true_false', label: 'Verdadero o falso', help: 'Afirmaciones para un juego de respuestas rápidas' },
  { value: 'multiple_choice', label: 'Opciones múltiples', help: 'Corre y aprende y futuros cuestionarios con cuatro opciones' },
  { value: 'matching', label: 'Unir conceptos', help: 'Parejas para un futuro minijuego de relación de conceptos' },
];
const fileLink = relative => {
  try {
    const base = new URL(api.defaults.baseURL || '/api', window.location.origin);
    return new URL(relative, base.origin).href;
  } catch { return relative; }
};
const emptyChanges = { deletedContentIds: [], renamedContents: [], activityIdsToAdd: [], activityIdsToRemove: [] };
const errorText = err => err?.response?.data?.message || err?.message || 'No se pudo completar la operación.';

export default function TeacherActivityStudioView() {
  const teacherSubjectId = Number(useParams().teacherSubjectId);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [files, setFiles] = useState([]);
  const [documentId, setDocumentId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [count, setCount] = useState(8);
  const [gameType, setGameType] = useState('true_false');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generated, setGenerated] = useState(null);
  const [draft, setDraft] = useState(null);

  const refresh = async () => {
    const data = await teacherSubjectService.getDetail(teacherSubjectId);
    setDetail(data);
  };
  useEffect(() => {
    let alive = true;
    teacherSubjectService.getDetail(teacherSubjectId).then(data => {
      if (alive) { setDetail(data); setLoading(false); }
    }).catch(err => { if (alive) { setError(errorText(err)); setLoading(false); } });
    return () => { alive = false; };
  }, [teacherSubjectId]);
  const perform = async (label, work) => {
    if (busy) return;
    setBusy(label); setError(''); setNotice('');
    try { await work(); } catch (err) { setError(errorText(err)); } finally { setBusy(''); }
  };
  const upload = () => perform('upload', async () => {
    if (!files.length) throw new Error('Seleccioná uno o varios PDF.');
    if (files.some(f => f.size > 10 * 1024 * 1024 || f.type !== 'application/pdf')) throw new Error('Solo PDF de 10 MB como máximo.');
    await teacherSubjectService.save(teacherSubjectId, { files, changes: emptyChanges });
    await refresh(); setFiles([]); setNotice('Material guardado. Ahora podés seleccionarlo para generar preguntas.');
  });
  const generate = () => perform('generate', async () => {
    if (!documentId && instructions.trim().length < 15) throw new Error('Elegí un PDF o escribí al menos 15 caracteres sobre el tema.');
    const result = await aiActivityService.preview({ teacherSubjectId, documentId: documentId || null, instructions, count: Number(count), gameType });
    setGenerated(result.content); setDraft(null);
    setTitle(`${detail?.subject?.nombre || 'Materia'} · ${types.find(x => x.value === gameType)?.label}`);
    setDescription(instructions.trim().slice(0, 1500));
    setNotice('La IA generó un borrador. Verificá las respuestas antes de guardar.');
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
    if (!generated || !rows.length) throw new Error('Generá y revisá al menos una pregunta.');
    const result = draft
      ? await aiActivityService.editDraft(draft.id, { teacherSubjectId, title, description, gameType, content: generated })
      : await aiActivityService.saveDraft({ teacherSubjectId, title, description, gameType, content: generated });
    setDraft(result); setNotice('Borrador guardado. No aparece todavía para alumnos.');
    await refresh();
  });
  const publish = () => perform('publish', async () => {
    if (!draft) throw new Error('Guardá primero el borrador.');
    await aiActivityService.publish(draft.id, teacherSubjectId);
    setNotice('¡Actividad publicada y vinculada a esta materia! Ya puede verse en Unity.');
    setGenerated(null); setDraft(null);
    await refresh();
  });
  const field = 'w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-blue-400';
  const label = 'mb-1.5 block text-sm font-semibold text-slate-200';
  const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold disabled:opacity-50';
  const disabled = !!busy;
  if (loading) return <div className="p-8 text-slate-200">Cargando taller de actividades...</div>;
  if (!detail) return <div role="alert" className="p-8 text-rose-300">{error || 'No se encontró la materia.'}</div>;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-slate-100">
      <header className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 p-6 sm:p-8">
        <Link to="/dashboard/my-subjects" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"><ArrowLeft size={16}/> Mis materias</Link>
        <div className="mt-4 flex flex-wrap items-center gap-3"><Sparkles className="text-amber-300"/><h1 className="text-2xl font-bold sm:text-3xl">Taller de actividades</h1></div>
        <p className="mt-2 text-slate-300">{detail.subject?.nombre} · {detail.course?.nombre}</p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">1. Prepará material. 2. Generá preguntas con IA. 3. Revisá cada respuesta. 4. Guardá el borrador y publicalo cuando esté listo.</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-200"><AlertTriangle className="mr-2 inline" size={18}/>{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-emerald-200"><CheckCircle2 className="mr-2 inline" size={18}/>{notice}</div>}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen size={22} className="text-blue-300"/> 1. Material de estudio</h2>
          <p className="my-3 text-sm text-slate-400">Usá los PDF que ya cargaste o subí otros. El PDF se procesa en el backend, no en el teléfono.</p>
          {(detail.contents || []).length === 0 ? <p className="my-3 text-sm text-amber-300">Todavía no hay documentos. Podés generar preguntas escribiendo el tema directamente.</p> :
            <div className="space-y-2">{(detail.contents || []).map(doc => <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm"><FileText size={16} className="text-blue-300"/><span className="min-w-0 flex-1 truncate" title={doc.name}>{doc.name}</span><a className="text-blue-300 underline" href={fileLink(doc.url)} target="_blank" rel="noreferrer">Ver</a></div>)}</div>}
          <label className={`${label} mt-5`}>Agregar material PDF</label>
          <input type="file" accept="application/pdf,.pdf" multiple className="block w-full text-sm" onChange={e => setFiles(Array.from(e.target.files || []))}/>
          <button disabled={disabled || !files.length} onClick={upload} className={`${btn} mt-3 bg-blue-600 text-white hover:bg-blue-500`}><Upload size={17}/> {busy === 'upload' ? 'Guardando...' : 'Subir PDF'}</button>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles size={22} className="text-amber-300"/> 2. Generar con IA</h2>
          <div className="mt-4 space-y-4">
            <div><label className={label}>PDF de referencia (opcional)</label><select value={documentId} onChange={e => { setDocumentId(e.target.value); setGenerated(null); setDraft(null); }} className={field}><option value="">Sin PDF: utilizar instrucciones de texto</option>{(detail.contents || []).filter(doc => doc.mimeType === 'application/pdf').map(doc => <option value={doc.id} key={doc.id}>{doc.name}</option>)}</select></div>
            <div><label className={label}>Tema e instrucciones</label><textarea className={`${field} min-h-28`} value={instructions} onChange={e => { setInstructions(e.target.value); setGenerated(null); setDraft(null); }} placeholder="Ej.: Sistema solar, 5.º grado. Priorizar rotación y traslación; lenguaje sencillo." maxLength={1500}/></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className={label}>Tipo de actividad</label><select className={field} value={gameType} onChange={e => { setGameType(e.target.value); setGenerated(null); setDraft(null); }}>{types.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className={label}>Cantidad</label><select className={field} value={count} onChange={e => setCount(Number(e.target.value))}>{[3,5,8,10,15].map(num => <option key={num} value={num}>{num} preguntas</option>)}</select></div></div>
            <p className="text-xs text-slate-400">{types.find(x => x.value === gameType)?.help}. La generación puede utilizar una API externa y consumir cuota.</p>
            <button disabled={disabled} onClick={generate} className={`${btn} w-full bg-amber-500 text-slate-950 hover:bg-amber-400`}><Sparkles size={18}/>{busy === 'generate' ? 'Generando preguntas...' : 'Generar preguntas'}</button>
          </div>
        </div>
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
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-700 pt-5"><button disabled={disabled} onClick={save} className={`${btn} bg-blue-600 text-white hover:bg-blue-500`}><Save size={17}/>{busy === 'save' ? 'Guardando...' : draft ? 'Guardar cambios del borrador' : 'Guardar como borrador'}</button><button disabled={disabled || !draft || gameType === 'matching'} onClick={publish} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}><CheckCircle2 size={17}/>{busy === 'publish' ? 'Publicando...' : 'Aprobar y publicar'}</button><button disabled={disabled} onClick={() => { setGenerated(null); setDraft(null); }} className={`${btn} border border-slate-600 text-slate-300`}>Cerrar borrador</button></div>
      </section>}
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-7"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Gamepad2 size={22} className="text-violet-300"/> 4. Actividades de la materia</h2><button className="flex items-center gap-1 text-sm text-blue-300" onClick={() => perform('refresh', refresh)}><RefreshCw size={15}/> Actualizar</button></div>
        {(detail.activities || []).length ? <div className="grid gap-3 sm:grid-cols-2">{detail.activities.map(a => <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4"><div><p className="font-semibold">{a.title}</p>{a.status === 'DRAFT' && <button className="text-sm text-blue-300 underline" onClick={() => { setGenerated(a.content); setDraft(a); setGameType(a.gameType); setTitle(a.title); setDescription(a.description || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Revisar y editar</button>}<p className="text-sm text-slate-400">{types.find(t => t.value === a.gameType)?.label || a.gameType}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.status === 'ACTIVE' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>{a.status === 'ACTIVE' ? 'Publicada' : a.status === 'DRAFT' ? 'Borrador' : a.status}</span></div>)}</div> : <p className="text-sm text-slate-400">Todavía no hay actividades vinculadas.</p>}
        <p className="mt-4 text-xs text-slate-400">Verdadero/falso y opciones múltiples tienen corrección en Express. El runner utiliza opciones múltiples para práctica sin nota; unir conceptos se guarda como borrador hasta incorporar su minijuego.</p>
      </section>
    </div>
  );
}
