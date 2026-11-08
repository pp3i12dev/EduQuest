import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import api from '../api/axios';
export default function VerifyEmailView() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const verification = useRef({ token: null, promise: null });
  const [message, setMessage] = useState(token ? 'Comprobando enlace…' : 'Ingresá tu correo para solicitar un nuevo enlace.');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  useEffect(() => {
    if (!token) return;
    // Una sola petición incluso con React.StrictMode, pero cada montaje
    // recibe el resultado. Así no se consume el token dos veces.
    if (verification.current.token !== token) {
      verification.current = { token, promise: api.post('/auth/verify-email', { token }) };
    }
    let active = true;
    verification.current.promise.then(({ data }) => { if (active) { setMessage(data.message); setError(false); } })
      .catch(err => { if (active) { setMessage(err.response?.data?.message || 'No se pudo verificar el enlace.'); setError(true); } });
    return () => { active = false; };
  }, [token]);
  async function resend(event) { event.preventDefault(); setBusy(true); setError(false);
    try { const { data } = await api.post('/auth/resend-verification', { email }); setMessage(data.message); }
    catch (e) { setMessage(e.response?.data?.message || 'No pudimos reenviar el correo.'); setError(true); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
    <div className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
      <h1 className="text-2xl font-bold">Verificar correo · EduQuest</h1>
      <p role={error ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-teal-500/30 bg-teal-500/10 text-teal-100'}`}>
        {error ? <AlertTriangle size={21} className="shrink-0"/> : token ? <CheckCircle2 size={21} className="shrink-0"/> : <Mail size={21} className="shrink-0"/>}{message}
      </p>
      <form onSubmit={resend} className="space-y-3">
        <label className="block text-sm text-slate-200">Correo electrónico
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"
            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-white focus:border-teal-400"/></label>
        <button disabled={busy} className="w-full rounded-xl bg-teal-600 p-3 font-semibold disabled:opacity-50">{busy ? 'Solicitando…' : 'Reenviar enlace de verificación'}</button>
      </form>
      <Link to="/login" className="inline-block text-sm text-sky-300 hover:underline">Volver a iniciar sesión</Link>
    </div>
  </main>;
}
