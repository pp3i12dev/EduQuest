import { useEffect, useState } from 'react';
import { Download, Smartphone, Info, X, CheckCircle2 } from 'lucide-react';

let cachedInstallPrompt = null;

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function InstallPwaButton({ compact = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => cachedInstallPrompt);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSecure = window.isSecureContext;

  useEffect(() => {
    const onPrompt = (event) => { event.preventDefault(); cachedInstallPrompt = event; setDeferredPrompt(event); };
    const onInstalled = () => { cachedInstallPrompt = null; setInstalled(true); setDeferredPrompt(null); setOpen(false); };
    const media = window.matchMedia?.('(display-mode: standalone)');
    const sync = () => setInstalled(isStandalone());
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media?.addEventListener?.('change', sync);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', sync);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!deferredPrompt) { setOpen(v => !v); return; }
    const event = deferredPrompt;
    cachedInstallPrompt = null;
    setDeferredPrompt(null); // El evento solo se puede usar una vez
    await event.prompt();
    const result = await event.userChoice;
    if (result?.outcome === 'accepted') setOpen(false);
  };

  const instructions = !isSecure
    ? 'Abrí EduQuest en una dirección HTTPS segura (o localhost para pruebas). Sin HTTPS no se habilita la instalación PWA completa ni Web Push.'
    : isIOS
      ? 'En iPhone/iPad: abrí EduQuest en Safari, tocá Compartir → Agregar a Inicio (o Añadir a pantalla de inicio), activá Abrir como app web si aparece y confirmá. Abrí EduQuest desde ese ícono.'
      : 'En Chrome o Edge: abrí el menú ⋮ o ⋯ → Instalar EduQuest / Instalar aplicación. Si no aparece, comprobá que la app tenga manifest e íconos válidos y estés en HTTPS o localhost. La opción depende del navegador.';

  return (
    <div className={compact ? 'relative shrink-0' : 'relative rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-white'}>
      <button type="button" onClick={install}
        title={deferredPrompt ? 'Instalar EduQuest en este dispositivo' : 'Instrucciones para instalar EduQuest'}
        aria-expanded={!deferredPrompt ? open : undefined}
        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-sky-400/40 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-sky-100 hover:border-sky-300 hover:bg-sky-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
      >
        {deferredPrompt ? <Download size={16}/> : <Smartphone size={16}/>}
        <span className={compact ? 'hidden sm:inline' : ''}>{deferredPrompt ? 'Instalar EduQuest' : 'Cómo instalar'}</span>
      </button>
      {!deferredPrompt && open && (
        <div role="dialog" aria-label="Cómo instalar EduQuest"
          className={compact
            ? 'absolute right-0 top-full z-50 mt-2 w-[min(88vw,340px)] rounded-xl border border-sky-500/40 bg-slate-950 p-4 text-left text-white shadow-2xl'
            : 'mt-3 rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-left'}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-bold"><Info size={17} className="text-sky-300"/> Instalar EduQuest</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar instrucciones" className="rounded p-1 hover:bg-slate-800"><X size={16}/></button>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">{instructions}</p>
          {isSecure && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300"><CheckCircle2 size={13}/> No necesitás descargar un APK.</p>}
        </div>
      )}
    </div>
  );
}
