import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import BackgroundLayout from '../layouts/BackgroundLayout';

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setPending(true); setError('');
    try { const { data } = await api.post('/auth/forgot-password', { email: email.trim() }); setMessage(data.message); }
    catch (e) { setError(e.response?.data?.message || 'No se pudo realizar la solicitud.'); }
    finally { setPending(false); }
  };
  return <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-5 py-14 text-white">
    <div className="absolute inset-0 opacity-40"><BackgroundLayout /></div>
    <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl">
      <span className="text-sm font-bold uppercase tracking-[.25em] text-amber-400">EduQuest · Seguridad</span>
      <h1 className="mt-4 text-3xl font-bold">Recuperar contraseña</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Ingresá el correo asociado a tu cuenta. Si existe, recibirás un enlace válido durante 15 minutos.</p>
      {message ? <div role="status" className="mt-6 rounded-xl bg-emerald-950/50 p-4 text-sm text-emerald-200"><ShieldCheck className="mb-2" />{message}</div> : <form onSubmit={submit} className="mt-7 space-y-4">
        <label htmlFor="recover-email" className="block text-sm font-semibold">Correo electrónico</label>
        <div className="relative"><Mail className="absolute left-4 top-3.5 text-slate-400" size={19}/><input id="recover-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="ejemplo@institucion.edu.ar" className="w-full rounded-xl border border-slate-600 bg-slate-950 px-12 py-3 text-white outline-none focus:border-amber-400" /></div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-3 font-bold text-slate-950 disabled:opacity-60"><Send size={18}/>{pending ? 'Enviando...' : 'Enviar enlace'}</button>
      </form>}
      <Link to="/login" className="mt-7 flex items-center gap-2 text-sm text-slate-300 hover:text-amber-300"><ArrowLeft size={17}/>Volver al inicio de sesión</Link>
    </section>
  </main>;
}
