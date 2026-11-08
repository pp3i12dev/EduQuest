import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ChevronLeft, CircleCheck, CircleAlert, History, KeyRound, LoaderCircle, Mail, RefreshCw, Save, Send, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { serviceConfigService as api } from '../services/serviceConfig.service';
import http from '../api/axios';

const inputStyle = 'mt-1 w-full rounded-xl border border-slate-600/70 bg-slate-950/65 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60';
const panel = 'eq-glass-card rounded-2xl border border-white/15 bg-slate-900/75 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6';
const label = 'block text-sm font-medium text-slate-200';
const actionButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/25 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';
const REGENERATE_PHRASE = 'REGENERAR VAPID Y ANULAR TODAS LAS SUSCRIPCIONES';
const formatAuditDate = value => value ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value)) : 'Sin datos';
const feedbackText = e => e?.response?.data?.message || e?.message || 'No se pudo completar la operación.';
const Status = ({ ready, enabled }) => <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${ready && enabled ? 'border-teal-400/30 bg-teal-500/10 text-teal-200' : 'border-amber-400/25 bg-amber-500/10 text-amber-200'}`}>{ready && enabled ? 'Activado' : ready ? 'Configurado, desactivado' : 'Sin configurar'}</span>;

export default function ServiceConfigView() {
  const { user } = useContext(AuthContext);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState(user?.institutionId || '');
  const [data, setData] = useState(null);
  const [smtp, setSmtp] = useState({ provider: 'gmail', user: '', fromName: '', password: '', enabled: false });
  const [gemini, setGemini] = useState({ model: 'gemini-2.5-flash', apiKey: '', enabled: false });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [confirmInitialPush, setConfirmInitialPush] = useState(false);
  const [showRegeneration, setShowRegeneration] = useState(false);
  const [regenerationText, setRegenerationText] = useState('');
  const isSuper = user?.isSuperAdmin === true && user?.roles?.includes('SUPER_ADMIN');

  useEffect(() => {
    if (!isSuper) return;
    http.get('/institutions').then(({ data: response }) => {
      const list = Array.isArray(response) ? response : response?.institutions || response?.data || [];
      setInstitutions(list);
      if (!institutionId && list.length) setInstitutionId(String(list[0].id));
    }).catch(() => setMessage({ ok: false, text: 'No se pudo cargar la lista de instituciones.' }));
  }, [isSuper]);

  const refresh = async (id = institutionId) => {
    if (!id) return;
    setBusy('load');
    try {
      const response = await api.summary(id);
      setData(response);
      setConfirmInitialPush(false);
      setShowRegeneration(false);
      setRegenerationText('');
      setSmtp({ provider: response.smtp.provider, user: response.smtp.user, fromName: response.smtp.fromName, password: '', enabled: response.smtp.enabled });
      setGemini({ model: response.gemini.model, apiKey: '', enabled: response.gemini.enabled });
    } catch (e) { setMessage({ ok: false, text: feedbackText(e) }); }
    finally { setBusy(''); }
  };
  useEffect(() => { if (institutionId) { setMessage(null); refresh(institutionId); } }, [institutionId]);

  const execute = async (action, fn) => {
    setBusy(action); setMessage(null);
    try {
      const result = await fn();
      if (result?.smtp && result?.gemini) {
        setData(result);
        setConfirmInitialPush(false);
        setShowRegeneration(false);
        setRegenerationText('');
        setSmtp(x => ({ ...x, password: '' }));
        setGemini(x => ({ ...x, apiKey: '' }));
      } else await refresh(institutionId);
      setMessage({ ok: true, text: result?.message || 'Configuración actualizada correctamente.' });
    } catch (e) { setMessage({ ok: false, text: feedbackText(e) }); }
    finally { setBusy(''); }
  };
  const canEdit = Boolean(data?.permissions?.canEdit);
  const canPush = Boolean(data?.permissions?.canManagePush);

  return <div className="mx-auto max-w-6xl space-y-6 pb-10 text-slate-100">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><Link to="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-sky-300 hover:text-sky-100"><ChevronLeft size={16}/> Panel principal</Link><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Configuración</h1><p className="mt-2 text-sm text-slate-300">Credenciales propias del colegio, conexión de IA y notificaciones del navegador.</p></div>
      <button type="button" className={secondaryButton} onClick={() => refresh()} disabled={Boolean(busy) || !institutionId}><RefreshCw size={16}/> Actualizar estado</button>
    </div>

    {isSuper && <div className={panel}><label className={label} htmlFor="institution-service-select">Institución a configurar</label><select id="institution-service-select" value={institutionId} onChange={e => setInstitutionId(e.target.value)} className={inputStyle}><option value="">Elegir institución</option>{institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.nombre}</option>)}</select></div>}
    {!data && busy === 'load' && <div className="flex items-center gap-3 text-slate-300"><LoaderCircle className="animate-spin"/> Cargando configuración…</div>}
    {message && <div role="status" className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${message.ok ? 'border-teal-400/30 bg-teal-900/20 text-teal-100' : 'border-rose-400/30 bg-rose-900/20 text-rose-100'}`}>{message.ok ? <CircleCheck size={19}/> : <CircleAlert size={19}/>}<span>{message.text}</span></div>}
    {data && !data.vaultReady && <div className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-950/30 p-4 text-sm text-amber-100"><CircleAlert className="shrink-0"/> El backend necesita JWT_SECRET válida para proteger las credenciales. Es el mismo secreto que utiliza para el inicio de sesión, no una clave adicional de servicios.</div>}

    {data && <>
      <section className={panel} aria-labelledby="mail-settings-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Mail className="text-sky-300"/><div><h2 id="mail-settings-heading" className="text-lg font-bold">Correo institucional (SMTP)</h2><p className="text-xs text-slate-300">Las invitaciones, verificaciones y avisos salen desde este correo.</p></div></div><Status ready={data.smtp.configured} enabled={data.smtp.enabled}/></div>
        {data.smtp.needsReconfiguration && <p role="alert" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-950/30 p-3 text-sm text-amber-100">La contraseña guardada anteriormente no se puede descifrar. Ingresá de nuevo la contraseña de aplicación y guardá los cambios.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="smtp-provider">Proveedor</label><select id="smtp-provider" className={inputStyle} value={smtp.provider} onChange={e => setSmtp(x => ({ ...x, provider: e.target.value }))} disabled={!canEdit}><option value="gmail">Gmail / Google Workspace</option></select></div>
          <div><label className={label} htmlFor="smtp-user">Correo emisor</label><input id="smtp-user" type="email" autoComplete="off" className={inputStyle} value={smtp.user} onChange={e => setSmtp(x => ({ ...x, user: e.target.value }))} placeholder="colegio@gmail.com" disabled={!canEdit}/></div>
          <div><label className={label} htmlFor="smtp-from">Nombre visible del remitente</label><input id="smtp-from" className={inputStyle} value={smtp.fromName} onChange={e => setSmtp(x => ({ ...x, fromName: e.target.value }))} placeholder="Colegio San Martín" disabled={!canEdit}/></div>
          <div><label className={label} htmlFor="smtp-secret">Contraseña de aplicación</label><input id="smtp-secret" type="password" autoComplete="new-password" className={inputStyle} value={smtp.password} onChange={e => setSmtp(x => ({ ...x, password: e.target.value }))} placeholder={data.smtp.configured ? 'Dejar vacío para conservar la actual' : 'Introducir contraseña de aplicación'} disabled={!canEdit}/><p className="mt-1 text-xs text-slate-400">No se devuelve ni se muestra después de guardarla.</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Servidor y puerto: smtp.gmail.com · 587 (STARTTLS). El colegio debe disponer de una contraseña de aplicación válida.</p>
        <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-teal-500" checked={smtp.enabled} onChange={e => setSmtp(x => ({ ...x, enabled: e.target.checked }))} disabled={!canEdit}/> Habilitar el envío de correos</label>
        {canEdit && <div className="mt-5 flex flex-wrap gap-3"><button className={actionButton} disabled={!!busy || !data.vaultReady} onClick={() => execute('smtp', () => api.saveSmtp({ institutionId, ...smtp }))}><Save size={16}/> Guardar correo</button><button className={secondaryButton} disabled={!!busy || !data.smtp.configured || !data.smtp.enabled} onClick={() => execute('smtpTest', () => api.testSmtp(institutionId))}><Send size={16}/> Enviar prueba a mi correo</button></div>}
      </section>

      <section className={panel} aria-labelledby="gemini-settings-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Sparkles className="text-violet-300"/><div><h2 id="gemini-settings-heading" className="text-lg font-bold">Inteligencia artificial — Gemini</h2><p className="text-xs text-slate-300">Generación asistida de borradores para docentes.</p></div></div><Status ready={data.gemini.configured} enabled={data.gemini.enabled}/></div>
        {data.gemini.needsReconfiguration && <p role="alert" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-950/30 p-3 text-sm text-amber-100">La clave Gemini antigua no se puede descifrar. Pegá nuevamente tu API Key y guardá los cambios.</p>}
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="gemini-model" className={label}>Modelo</label><input id="gemini-model" className={inputStyle} value={gemini.model} onChange={e => setGemini(x => ({ ...x, model: e.target.value }))} placeholder="gemini-2.5-flash" disabled={!canEdit}/></div><div><label htmlFor="gemini-secret" className={label}>Clave API</label><input id="gemini-secret" type="password" autoComplete="new-password" className={inputStyle} value={gemini.apiKey} onChange={e => setGemini(x => ({ ...x, apiKey: e.target.value }))} placeholder={data.gemini.configured ? 'Dejar vacío para conservar la actual' : 'Pegar clave API'} disabled={!canEdit}/></div></div>
        <p className="mt-2 text-xs text-slate-400">Pegá solo la clave de Gemini o la línea <code>GEMINI_API_KEY=...</code> de tu .env. EduQuest elimina comillas externas; la validez real se comprueba con «Probar conexión» después de guardar.</p>
        <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-teal-500" checked={gemini.enabled} onChange={e => setGemini(x => ({ ...x, enabled: e.target.checked }))} disabled={!canEdit}/> Habilitar generación con IA</label>
        <p className="mt-2 text-xs text-slate-400">La prueba consulta el modelo disponible. No crea actividades ni consume una generación de preguntas.</p>
        {canEdit && <div className="mt-5 flex flex-wrap gap-3"><button className={actionButton} disabled={!!busy || !data.vaultReady} onClick={() => execute('gemini', () => api.saveGemini({ institutionId, ...gemini }))}><Save size={16}/> Guardar Gemini</button><button className={secondaryButton} disabled={!!busy || !data.gemini.configured || !data.gemini.enabled} onClick={() => execute('geminiTest', () => api.testGemini(institutionId))}><Sparkles size={16}/> Probar conexión</button></div>}
      </section>

      <section className={panel} aria-labelledby="push-settings-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><BellRing className="text-teal-300"/><div>
            <h2 id="push-settings-heading" className="text-lg font-bold">Notificaciones Web Push</h2>
            <p className="text-xs text-slate-300">Un solo par VAPID para toda la instalación de EduQuest, compartido por los colegios que utilicen este servidor.</p>
          </div></div><Status ready={data.push.configured} enabled={data.push.enabled}/>
        </div>
        {data.push.needsReconfiguration && <p role="alert" className="mb-4 rounded-lg border border-rose-400/40 bg-rose-950/30 p-3 text-sm text-rose-100">Las claves VAPID existentes no se pueden descifrar. Si no se puede recuperar la configuración anterior del servidor, solo una regeneración excepcional permitirá reactivar Web Push. Esta operación anulará todas las suscripciones existentes.</p>}
        <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-4 text-xs text-slate-300">
          <p>Clave pública: {data.push.publicKey ? <span className="break-all font-mono">{data.push.publicKey}</span> : 'Todavía no generada'}</p>
          <p className="mt-2 flex items-center gap-2"><ShieldCheck size={15}/> La clave privada nunca se devuelve desde el servidor.</p>
        </div>
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100" role="note">
          <div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 shrink-0" size={20}/><div>
            <p className="font-bold">Generá las claves solo una vez. No deben cambiarse durante el uso habitual.</p>
            <p className="mt-1">Regenerarlas desactiva todas las suscripciones Web Push registradas y cancela los envíos pendientes. Los usuarios deberán activar las notificaciones nuevamente en sus dispositivos, incluso en otras instituciones de esta instalación.</p>
            <p className="mt-2 font-semibold">La acción quedará registrada con el usuario responsable, su ID, rol y la fecha y hora exactas.</p>
          </div></div>
        </div>
        {data.push.lastGeneration && <div className="mt-4 rounded-xl border border-teal-500/25 bg-teal-950/20 px-4 py-3 text-sm text-teal-100">
          <p className="font-semibold">Última {data.push.lastGeneration.action === 'VAPID_REGENERATED' ? 'regeneración' : 'generación'} registrada</p>
          <p className="mt-1">{data.push.lastGeneration.actorName} · {data.push.lastGeneration.actorRole} · Usuario #{data.push.lastGeneration.actorId}</p>
          <p className="mt-1 text-xs">{formatAuditDate(data.push.lastGeneration.createdAt)} (hora de Argentina)</p>
        </div>}
        {canPush && <div className="mt-5 space-y-4">
          {!data.push.exists ? <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" className="mt-1 h-4 w-4 accent-teal-500" checked={confirmInitialPush} onChange={e => setConfirmInitialPush(e.target.checked)}/>
              Entiendo que las claves VAPID se generan una sola vez, que esta operación queda auditada y que una futura regeneración obligará a volver a suscribir los dispositivos.
            </label>
            <button type="button" className={actionButton} disabled={!!busy || !data.vaultReady || !confirmInitialPush} onClick={() => execute('generatePush', () => api.generatePush())}>
              <KeyRound size={16}/> Generar y guardar claves VAPID
            </button>
          </div> : <div className="flex flex-wrap gap-3">
            <button type="button" className={secondaryButton} disabled={!!busy} onClick={() => execute('togglePush', () => api.togglePush(!data.push.enabled))}>{data.push.enabled ? 'Desactivar envíos' : 'Activar envíos'}</button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-950/30 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-950/50 disabled:opacity-50" disabled={!!busy} onClick={() => { setShowRegeneration(v => !v); setRegenerationText(''); }}>
              <TriangleAlert size={17}/> Regeneración excepcional
            </button>
          </div>}
          {data.push.exists && showRegeneration && <div className="rounded-xl border-2 border-rose-500/50 bg-rose-950/30 p-4 sm:p-5">
            <h3 className="font-bold text-rose-100">Atención: operación destructiva para todas las suscripciones</h3>
            <p className="mt-2 text-sm text-rose-100">Esta operación registra tu identidad, invalida las suscripciones actuales de todos los dispositivos y cancela envíos pendientes. Solo se justifica si las claves están comprometidas o es necesario reemplazarlas.</p>
            <label htmlFor="regenerate-vapid-phrase" className="mt-4 block text-sm font-semibold text-white">Para confirmar, escribí exactamente:</label>
            <p className="mt-2 select-all break-words rounded-md border border-rose-400/30 bg-black/30 p-3 font-mono text-xs font-bold text-rose-100">{REGENERATE_PHRASE}</p>
            <input id="regenerate-vapid-phrase" type="text" autoComplete="off" spellCheck={false} className={inputStyle} value={regenerationText} onChange={e => setRegenerationText(e.target.value)} placeholder="Escribí la frase completa"/>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40" disabled={!!busy || !data.vaultReady || regenerationText !== REGENERATE_PHRASE} onClick={() => execute('regeneratePush', () => api.regeneratePush(regenerationText, data.push.publicKey))}>
                Confirmar y anular suscripciones
              </button>
              <button type="button" className={secondaryButton} onClick={() => { setRegenerationText(''); setShowRegeneration(false); }}>Cancelar</button>
            </div>
          </div>}
        </div>}
        <div className="mt-6 border-t border-slate-700/60 pt-5">
          <div className="mb-3 flex items-center gap-2"><History size={18} className="text-sky-300"/><h3 className="text-base font-bold">Historial de generación de claves VAPID</h3></div>
          {!data.push.history?.length ? <p className="text-sm text-slate-400">Todavía no hay operaciones de generación registradas.</p> :
            <div className="overflow-x-auto rounded-xl border border-slate-700/80">
              <table className="min-w-[560px] w-full text-left text-sm">
                <thead className="bg-slate-800/80 text-slate-200"><tr><th className="px-4 py-3">Acción</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Fecha y hora (Argentina)</th></tr></thead>
                <tbody>{data.push.history.map(record => <tr key={record.id} className="border-t border-slate-700/60 text-slate-300">
                  <td className="px-4 py-3">{record.action === 'VAPID_REGENERATED' ? 'Regeneración' : 'Generación inicial'}</td>
                  <td className="px-4 py-3"><strong className="text-white">{record.actorName}</strong><div className="mt-1 text-xs">{record.actorRole} · Usuario #{record.actorId}</div>{record.actorEmail && <div className="text-xs">{record.actorEmail}</div>}</td>
                  <td className="px-4 py-3">{formatAuditDate(record.createdAt)}</td>
                </tr>)}</tbody>
              </table>
            </div>}
          <p className="mt-2 text-xs text-slate-400">Se muestran las últimas 40 generaciones/regeneraciones. El registro completo queda en la base de datos, también si el responsable cambia su perfil.</p>
        </div>
      </section>
      {!canEdit && <p className="text-sm text-slate-400">Tenés permisos de consulta. Para cambiar SMTP, Gemini o Web Push, contactá a un directivo o superadministrador.</p>}
    </>}
  </div>;
}
