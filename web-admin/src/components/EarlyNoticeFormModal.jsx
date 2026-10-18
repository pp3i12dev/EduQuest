import { createPortal } from 'react-dom';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useEarlyNoticeCreationOptions } from '../hooks/useEarlyNotices';
import EarlyNoticeLegacyFormModal from './EarlyNoticeLegacyFormModal';

const DAYS = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
const DAY_LABELS = { LUNES:'Lunes', MARTES:'Martes', MIERCOLES:'Miércoles', JUEVES:'Jueves', VIERNES:'Viernes', SABADO:'Sábado' };
const TYPES = [
  ['ABSENCE','Ausencia'], ['LATE_ARRIVAL','Llegada tarde'],
  ['ATTENDANCE_CONFIRMED','Confirmación de asistencia'],
  ['VIRTUAL_SYNCHRONOUS','Clase virtual sincrónica'],
  ['VIRTUAL_ASYNCHRONOUS','Clase virtual asincrónica'],
];
const FIELD = 'w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-400';
const format = value => `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;
const dateAtUTC = value => new Date(`${value}T00:00:00.000Z`);
const iso = date => date.toISOString().slice(0,10);
const name = a => `${a.teacher?.user?.firstName || ''} ${a.teacher?.user?.lastName || ''}`.trim();
const courseName = a => `${a.subject?.nombre || 'Materia'} · ${a.course?.nombre || 'Curso'}`;
const groupId = a => Number(a.teacherUserId ?? a.teacher?.user?.id);
const scheduleFor = (a, all) => (a.schedules?.length ? a.schedules : all.filter(s => Number(s.courseId) === Number(a.courseId) && Number(s.subjectId) === Number(a.subjectId)));

export default function EarlyNoticeFormModal(props) {
  const { open, initialData, token, onSubmit, onClose, isSaving, formError } = props;
  const { user } = useContext(AuthContext);
  const [teacherId,setTeacherId] = useState('');
  const [type,setType] = useState('ABSENCE');
  const [duration,setDuration] = useState('single');
  const [start,setStart] = useState('');
  const [end,setEnd] = useState('');
  const [selected,setSelected] = useState([]);
  const [reason,setReason] = useState('');
  const [arrival,setArrival] = useState('');
  const [meetingUrl,setMeetingUrl] = useState('');
  const [instructions,setInstructions] = useState('');
  const [error,setError] = useState('');
  const { data, isLoading, isError } = useEarlyNoticeCreationOptions(token, open && !initialData?.id);
  const options = data?.data ?? data?.options ?? data ?? {};
  const assignments = useMemo(() => (Array.isArray(options.assignments) ? options.assignments : []).filter(a => a.isActive !== false), [data]);
  const schedules = useMemo(() => Array.isArray(options.schedules) ? options.schedules : [], [data]);
  const teachers = useMemo(() => [...new Map(assignments.map(a => [groupId(a), {id:groupId(a), name:name(a)}])).values()].filter(t => t.id), [assignments]);
  useEffect(() => {
    if (!open || initialData?.id) return;
    setTeacherId(''); setType('ABSENCE'); setDuration('single'); setStart(''); setEnd('');
    setSelected([]); setReason(''); setArrival(''); setMeetingUrl(''); setInstructions(''); setError('');
  }, [open, initialData?.id]);
  useEffect(() => {
    if (!teacherId && teachers.length === 1) setTeacherId(String(teachers[0].id));
  }, [teachers, teacherId]);
  const teacherAssignments = useMemo(() => assignments.filter(a => String(groupId(a)) === teacherId), [assignments, teacherId]);
  const effectiveEnd = duration === 'single' ? start : end;
  const periodError = !start || !effectiveEnd ? '' : effectiveEnd < start ? 'La fecha final debe ser igual o posterior a la inicial.' : Math.round((dateAtUTC(effectiveEnd) - dateAtUTC(start))/86400000) > 90 ? 'El período no puede superar los 91 días.' : '';
  const classes = useMemo(() => {
    if (!start || !effectiveEnd || periodError || !teacherId) return [];
    const days = Math.round((dateAtUTC(effectiveEnd) - dateAtUTC(start))/86400000);
    const result = [];
    for (let i=0;i<=days;i++) {
      const date = new Date(dateAtUTC(start).getTime() + i*86400000);
      const classDate = iso(date);
      const day = DAYS[date.getUTCDay()];
      for (const a of teacherAssignments) {
        for (const s of scheduleFor(a,schedules)) {
          if (s.day !== day) continue;
          result.push({key:`${a.id}:${s.id}:${classDate}`,teacherSubjectId:Number(a.id),scheduleId:Number(s.id),classDate,subject:a.subject?.nombre,course:a.course?.nombre,shift:s.shift,startTime:s.startTime,endTime:s.endTime});
        }
      }
    }
    return result.sort((a,b) => a.classDate.localeCompare(b.classDate) || a.startTime.localeCompare(b.startTime) || a.course.localeCompare(b.course));
  }, [start,effectiveEnd,periodError,teacherAssignments,schedules,teacherId]);
  const selectedSet = useMemo(() => new Set(selected),[selected]);
  const chosen = classes.filter(c => selectedSet.has(c.key));
  const setFieldTeacher = value => {setTeacherId(value);setSelected([]);setError('');};
  const changePeriod = (setter,value) => {setter(value);setSelected([]);setError('');};
  const submit = e => {
    e.preventDefault();setError('');
    if (!teacherId) return setError('Seleccioná un docente.');
    if (!start || !effectiveEnd || periodError) return setError(periodError || 'Indicá el período.');
    if (!chosen.length) return setError('Seleccioná al menos una clase afectada.');
    if (!reason.trim()) return setError('Indicá el motivo.');
    if (reason.trim().length > 2000) return setError('El motivo no puede superar los 2000 caracteres.');
    if (type === 'LATE_ARRIVAL') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival)) return setError('Ingresá una hora estimada válida.');
      if (chosen.some(c => arrival <= c.startTime || arrival >= c.endTime)) return setError('La hora estimada debe estar dentro de cada clase seleccionada.');
    }
    if (type === 'VIRTUAL_SYNCHRONOUS') {
      try {const url = new URL(meetingUrl); if (!['https:','http:'].includes(url.protocol)) throw new Error();}
      catch {return setError('Ingresá un enlace de videollamada válido.');}
    }
    if (type === 'VIRTUAL_ASYNCHRONOUS' && !instructions.trim()) return setError('Indicá las instrucciones o materiales.');
    onSubmit({type,periodStart:start,periodEnd:effectiveEnd,teacherUserId:Number(teacherId),reason:reason.trim(),
      estimatedArrivalTime:type === 'LATE_ARRIVAL' ? arrival : null,
      virtualMeetingUrl:type === 'VIRTUAL_SYNCHRONOUS' ? meetingUrl.trim() : null,
      virtualInstructions:type === 'VIRTUAL_ASYNCHRONOUS' ? instructions.trim() : null,
      classes:chosen.map(c=>({teacherSubjectId:c.teacherSubjectId,scheduleId:c.scheduleId,classDate:c.classDate}))});
  };
  if (initialData?.id) return <EarlyNoticeLegacyFormModal {...props}/>;
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget && !isSaving)onClose();}}>
    <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-700 px-6 py-5">
        <div><h2 className="text-2xl font-bold">Nuevo aviso temprano</h2><p className="mt-1 text-sm text-slate-400">Elegí un período y marcá exactamente las clases afectadas.</p></div>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-800" aria-label="Cerrar">×</button>
      </header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-6 overflow-y-auto p-6">
          {isLoading && <p className="text-blue-200">Cargando asignaciones y horarios…</p>}
          {isError && <p className="text-red-300">No se pudieron cargar los horarios del docente.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">Docente responsable
              <select className={`${FIELD} cursor-pointer`} value={teacherId} onChange={e=>setFieldTeacher(e.target.value)} required><option value="">Seleccionar docente</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </label>
            <label className="space-y-2 text-sm font-semibold">Tipo de aviso
              <select className={`${FIELD} cursor-pointer`} value={type} onChange={e=>setType(e.target.value)}>{TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
            </label>
          </div>
          <section className="space-y-3 border-t border-slate-700 pt-5">
            <h3 className="text-lg font-bold">Período del aviso</h3>
            <div className="flex flex-wrap gap-5 text-sm"><label className="flex cursor-pointer items-center gap-2"><input type="radio" checked={duration==='single'} onChange={()=>{setDuration('single');setSelected([]);}}/> Un día</label><label className="flex cursor-pointer items-center gap-2"><input type="radio" checked={duration==='multiple'} onChange={()=>{setDuration('multiple');setSelected([]);}}/> Varios días</label></div>
            <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-semibold">Fecha de inicio<input type="date" className={FIELD} value={start} onChange={e=>changePeriod(setStart,e.target.value)} required/></label>
            {duration==='multiple' && <label className="space-y-2 text-sm font-semibold">Fecha de finalización (inclusive)<input type="date" min={start || undefined} className={FIELD} value={end} onChange={e=>changePeriod(setEnd,e.target.value)} required/></label>}</div>
            {periodError && <p className="text-sm text-red-300">{periodError}</p>}
          </section>
          <section className="space-y-3 border-t border-slate-700 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Clases afectadas</h3><p className="text-sm text-slate-400">Se muestran los horarios reales del docente, incluso de distintas materias y cursos. Ninguna clase se selecciona automáticamente.</p></div><span className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-bold">{chosen.length} de {classes.length} seleccionadas</span></div>
            {classes.length>0 && <div className="flex gap-3"><button type="button" className="cursor-pointer text-sm text-blue-300 hover:underline" onClick={()=>setSelected(classes.map(c=>c.key))}>Seleccionar todas</button><button type="button" className="cursor-pointer text-sm text-slate-300 hover:underline" onClick={()=>setSelected([])}>Quitar selección</button></div>}
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-700 p-3">
              {classes.length===0 ? <p className="p-3 text-sm text-slate-400">{!teacherId || !start || !effectiveEnd ? 'Elegí docente y período para consultar sus clases.' : 'No hay clases programadas para ese período.'}</p> : classes.map(c=><label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3 hover:border-blue-500"><input type="checkbox" className="mt-1 h-4 w-4 accent-blue-500" checked={selectedSet.has(c.key)} onChange={e=>setSelected(old=>e.target.checked?[...old,c.key]:old.filter(k=>k!==c.key))}/><span><strong>{DAY_LABELS[DAYS[dateAtUTC(c.classDate).getUTCDay()]]} {format(c.classDate)} · {c.startTime}–{c.endTime}</strong><span className="block text-sm text-slate-300">{c.subject} · {c.course} · {c.shift}</span></span></label>)}
            </div>
          </section>
          {type==='LATE_ARRIVAL' && <label className="block space-y-2 text-sm font-semibold">Hora estimada de llegada<input type="time" className={FIELD} value={arrival} onChange={e=>setArrival(e.target.value)} required/></label>}
          {type==='VIRTUAL_SYNCHRONOUS' && <label className="block space-y-2 text-sm font-semibold">Enlace de videollamada<input type="url" className={FIELD} value={meetingUrl} onChange={e=>setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." required/></label>}
          {type==='VIRTUAL_ASYNCHRONOUS' && <label className="block space-y-2 text-sm font-semibold">Materiales e instrucciones<textarea rows={4} className={FIELD} value={instructions} onChange={e=>setInstructions(e.target.value)} required/></label>}
          <label className="block space-y-2 text-sm font-semibold">Motivo del aviso<textarea rows={3} className={FIELD} value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000} required placeholder="Descripción breve para los destinatarios. Evitá datos médicos sensibles."/></label>
          {(error || formError) && <p role="alert" className="rounded-lg border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">{error || formError}</p>}
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-700 bg-slate-950 p-4"><button type="button" onClick={onClose} disabled={isSaving} className="cursor-pointer rounded-xl border border-slate-600 px-5 py-3 hover:bg-slate-800">Cancelar</button><button type="submit" disabled={isSaving || isLoading || !chosen.length} className="cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{isSaving?'Guardando…':`Crear aviso (${chosen.length} clases)`}</button></footer>
      </form>
    </div>
  </div>,document.body);
}
