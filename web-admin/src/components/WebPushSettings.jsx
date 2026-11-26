import { useContext, useEffect, useState } from 'react';
import { BellRing, BellOff, LoaderCircle, Send } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import {
  prepareWebPush, activatePush, deactivatePush,
  currentPushStatus, pushSupport, testWebPush,
  rememberPushPreference, restorePreferredPush,
} from '../services/webPush';

export default function WebPushSettings({ compact = false }) {
  const { token, user } = useContext(AuthContext);
  const userId = user?.id;
  const [prepared, setPrepared] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [open, setOpen] = useState(false);
  const capability = pushSupport();

  useEffect(() => {
    if (!token || userId === null || userId === undefined) return undefined;
    let alive = true;
    setLoading(true);
    prepareWebPush()
      .then(async ready => {
        let active = await currentPushStatus(ready);
        let subscription = ready.existingSubscription;
        let notice = '';
        if (active) {
          // Las cuentas que ya tenían Push activo conservan esa decisión.
          rememberPushPreference(userId, true);
        } else {
          try {
            const restored = await restorePreferredPush(ready, userId);
            if (restored) {
              subscription = restored;
              active = true;
              notice = 'Se restauraron automáticamente los avisos de esta cuenta.';
            }
          } catch (error) {
            // Si iOS o un navegador exige otro gesto, queda el botón manual.
            notice = error.response?.data?.message || error.message || 'Activá las notificaciones desde el botón.';
          }
        }
        if (alive) {
          setPrepared({ ...ready, existingSubscription: subscription });
          setEnabled(active);
          setFeedback(notice);
        }
      })
      .catch(error => {
        if (alive) {
          setPrepared(null);
          setEnabled(false);
          setFeedback(error.message);
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, userId]);

  async function handleActivate() {
    setBusy(true); setFeedback('');
    try {
      const sub = await activatePush(prepared);
      setPrepared(old => ({ ...old, existingSubscription: sub }));
      setEnabled(true);
      rememberPushPreference(userId, true);
      setFeedback('Notificaciones habilitadas en este navegador. Podés enviarte una prueba.');
    } catch (error) { setFeedback(error.message || 'No se pudieron activar las notificaciones.'); }
    finally { setBusy(false); }
  }

  async function handleDeactivate() {
    setBusy(true); setFeedback('');
    try {
      await deactivatePush(prepared);
      setEnabled(false);
      rememberPushPreference(userId, false);
      setPrepared(old => old ? { ...old, existingSubscription: null } : null);
      setFeedback('Avisos desactivados en este dispositivo. Permanecen disponibles dentro de EduQuest.');
    } catch (error) { setFeedback(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }

  async function handleTest() {
    setBusy(true); setFeedback('');
    try {
      const answer = await testWebPush(prepared);
      setFeedback(answer.message || 'El proveedor recibió la notificación de prueba.');
    } catch (error) { setFeedback(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }

  const settingsPanel = (
    <section className="rounded-2xl border border-sky-400/30 bg-slate-900/95 p-4 text-white shadow-lg sm:p-5">
      <div className="flex items-center gap-3">
        <BellRing className="shrink-0 text-sky-400" size={24} />
        <div>
          <h2 className="text-lg font-bold">Notificaciones en este dispositivo</h2>
          <p className="text-sm text-slate-300">Avisos institucionales y ausencias, incluso con EduQuest cerrado.</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Solo se pueden habilitar si aceptás el permiso del navegador. Podés desactivarlas cuando quieras.
        En computadoras compartidas, cerrá sesión al terminar.
      </p>
      {loading && <p className="mt-3 text-sm text-sky-200">Preparando servicio de notificaciones…</p>}
      {!loading && !capability.ok && <p role="status" className="mt-3 text-sm text-amber-300">{capability.reason}</p>}
      {!loading && feedback && <p role="status" className="mt-3 text-sm text-amber-300">{feedback}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleActivate}
          disabled={loading || busy || enabled || !capability.ok || !prepared}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {busy ? <LoaderCircle size={17} className="animate-spin" /> : <BellRing size={17}/>} {enabled ? 'Notificaciones activadas' : 'Activar notificaciones'}
        </button>
        {enabled && <>
          <button type="button" onClick={handleTest} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/50 px-4 py-2.5 text-sm font-semibold hover:bg-sky-500/20 disabled:opacity-50">
            <Send size={16}/> Enviar prueba
          </button>
          <button type="button" onClick={handleDeactivate} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-4 py-2.5 text-sm hover:bg-slate-700 disabled:opacity-50">
            <BellOff size={17}/> Desactivar aquí
          </button>
        </>}
      </div>
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
      {open && <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,390px)]">
        {settingsPanel}
        <button type="button" onClick={() => setOpen(false)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Cerrar</button>
      </div>}
    </div>
  );
}
