import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import BackgroundLayout from '../layouts/BackgroundLayout';

export default function ResetPasswordView() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (password.length < 10) { setError('La contraseña debe tener al menos 10 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setPending(true);
    try { await api.post('/auth/reset-password', { token, password }); setSuccess(true); setPassword(''); setConfirm(''); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo restablecer la contraseña.'); }
    finally { setPending(false); }
  };
  return <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
    <div className="absolute inset-0 opacity-40"><BackgroundLayout /></div>
    <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl">
      <span className="text-sm font-bold uppercase tracking-[.24em] text-amber-400">EduQuest · Seguridad</span><h1 className="mt-4 text-3xl font-bold">Nueva contraseña</h1>
      {success ? <div role="status" className="mt-7 rounded-xl bg-emerald-950/60 p-5 text-emerald-200"><ShieldCheck className="mb-2"/>Contraseña actualizada. Ya podés iniciar sesión.</div> :
        !/^[a-f0-9]{64}$/.test(token) ? <p className="mt-5 text-amber-300">El enlace es inválido. Solicitá uno nuevo.</p> :
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label htmlFor="new-password" className="block text-sm font-semibold">Nueva contraseña (mínimo 10 caracteres)</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3 outline-none focus:border-amber-400" />
          <label htmlFor="confirm-password" className="block text-sm font-semibold">Confirmar contraseña</label>
          <input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3 outline-none focus:border-amber-400" />
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-3 font-bold text-slate-950 disabled:opacity-60"><LockKeyhole size={18}/>{pending ? 'Guardando...' : 'Cambiar contraseña'}</button>
        </form>}
      <Link to="/login" className="mt-7 block text-sm text-amber-300 hover:text-yellow-200">Volver al inicio de sesión</Link>
      {!success && <Link to="/olvide-contrasena" className="mt-3 block text-sm text-slate-400 hover:text-white">Solicitar otro enlace</Link>}
    </section>
  </main>;
}
