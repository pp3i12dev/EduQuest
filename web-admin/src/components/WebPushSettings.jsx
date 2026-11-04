import { useContext, useEffect, useState } from 'react';
import { BellRing, BellOff, LoaderCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { activatePush, deactivatePush, currentPushStatus, pushSupport } from '../services/webPush';
import api from '../api/axios';

export default function WebPushSettings({ compact = false }) {
  const { token } = useContext(AuthContext);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [configured, setConfigured] = useState(false);
  const [open, setOpen] = useState(false);
  const capability = pushSupport();
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.get('/push/config').then(({ data }) => { if (alive) setConfigured(Boolean(data.enabled)); })
      .catch(() => { if (alive) setConfigured(false); });
    if (capability.ok) currentPushStatus().then(active => { if (alive) setEnabled(active); }).catch(() => {});
    return () => { alive = false; };
  }, [token, capability.ok]);
  async function handleActivate() {
    setBusy(true); setFeedback('');
    try { await activatePush(); setEnabled(true); setFeedback('Listo. Este dispositivo quedó registrado para recibir avisos.'); }
    catch (e) { setFeedback(e.message || 'No se pudieron activar las notificaciones'); }
    finally { setBusy(false); }
  }
  async function handleDeactivate() {
    setBusy(true); setFeedback('');
    try { await deactivatePush(); setEnabled(false); setFeedback('Desactivaste las notificaciones en este dispositivo. Los avisos seguirán guardados en EduQuest.'); }
    catch (e) { setFeedback(e.response?.data?.message || e.message || 'No se pudieron desactivar'); }
    finally { setBusy(false); }
  }
  const settingsPanel = (
    <section className="rounded-2xl border border-blue-400/25 bg-slate-900/95 p-4 text-white shadow-lg sm:p-5">
      <div className="flex items-center gap-3">
        <BellRing className="shrink-0 text-sky-400" size={24} />
        <div>
          <h2 className="font-bold text-lg">Notificaciones en este dispositivo</h2>
          <p className="text-sm text-slate-300">Avisos tempranos y comunicaciones institucionales, aun cuando EduQuest esté cerrado.</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">La autorización es voluntaria. Podés cambiarla desde Mi perfil o la configuración del navegador. No mostramos información sensible en la pantalla bloqueada.</p>
      {!configured && <p role="status" className="mt-3 text-sm text-amber-300">El servidor aún no tiene activada la configuración Web Push.</p>}
      {!capability.ok && <p role="status" className="mt-3 text-sm text-amber-300">{capability.reason}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleActivate} disabled={busy || enabled || !capability.ok || !configured}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <BellRing size={17}/>} {enabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
        </button>
        {enabled && <button type="button" onClick={handleDeactivate} disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm hover:bg-slate-800 disabled:opacity-50"><BellOff size={17}/> Desactivar aquí</button>}
      </div>
      {feedback && <p role="status" className="mt-3 text-sm text-sky-200">{feedback}</p>}
    </section>
  );
  if (!compact) return settingsPanel;
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen(v => !v)} title="Notificaciones de EduQuest" aria-expanded={open}
        className={`relative flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold hover:bg-sky-500/15 ${enabled ? 'border-emerald-500/40 text-emerald-300' : 'border-sky-500/40 text-sky-200'}`}>
        {enabled ? <BellRing size={18} /> : <BellOff size={18} />}
        <span className="sr-only">Administrar notificaciones</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,390px)]">
          {settingsPanel}
          <button type="button" onClick={() => setOpen(false)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Cerrar</button>
        </div>
      )}
    </div>
  );
}
