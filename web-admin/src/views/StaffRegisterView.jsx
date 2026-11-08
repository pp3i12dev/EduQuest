import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-teal-400';
const roles = [{ id: 'TEACHER', name: 'Docente' }, { id: 'PRECEPTOR', name: 'Preceptor' }, { id: 'DIRECTOR', name: 'Directivo' }];
export default function StaffRegisterView() {
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState({ role: '', institutionId: '', firstName: '', lastName: '',
    dni: '', email: '', telefono: '', password: '', repeatPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => { let active = true;
    api.get('/public/institutions').then(({ data }) => { if (active) setInstitutions(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setError('No se pudieron cargar las instituciones.'); });
    return () => { active = false; };
  }, []);
  const field = event => { setForm(old => ({ ...old, [event.target.name]: event.target.value })); setError(''); };
  const submit = async event => { event.preventDefault(); setError('');
    if (form.password !== form.repeatPassword) return setError('Las contraseñas no coinciden.');
    if (form.password.length < 10) return setError('La contraseña requiere al menos 10 caracteres.');
    setBusy(true);
    try { const { repeatPassword, ...payload } = form;
      await api.post('/auth/register-staff', { ...payload, institutionId: Number(form.institutionId) });
      setSuccess(true);
    } catch (e) { setError(e.response?.data?.message || 'No se pudo completar tu solicitud.'); }
    finally { setBusy(false); }
  };
  const input = (key, label, type = 'text', required = true) => <label className="block text-sm font-medium text-slate-200" key={key}>{label}
    <input name={key} type={type} required={required} value={form[key]} onChange={field} autoComplete={key === 'password' || key === 'repeatPassword' ? 'new-password' : undefined}
      className={fieldClass} maxLength={type === 'password' ? 128 : 150} /></label>;
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
    <div className="mx-auto max-w-2xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sky-300" to="/login"><ArrowLeft size={17}/> Volver a iniciar sesión</Link>
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-9">
        <h1 className="text-2xl font-bold">Solicitud de alta de personal</h1>
        <p className="mt-2 text-sm text-slate-300">Verificá tu correo y esperá que una autoridad de la institución apruebe la solicitud. La inscripción no concede permisos inmediatamente.</p>
        {success ? <div role="status" className="mt-6 space-y-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-5 text-teal-50">
          <CheckCircle2 size={28}/><h2 className="text-lg font-semibold">Solicitud recibida</h2>
          <p>Revisá tu correo para validar tu dirección. Después quedará pendiente de aprobación institucional.</p>
          <Link to="/verificar-correo" className="inline-block text-teal-200 underline">Reenviar verificación</Link>
        </div> : <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-200">Institución
            <select className={fieldClass} name="institutionId" required value={form.institutionId} onChange={field}>
              <option value="">Seleccioná</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select></label>
          <label className="block text-sm font-medium text-slate-200">Rol solicitado
            <select className={fieldClass} name="role" required value={form.role} onChange={field}>
              <option value="">Seleccioná</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></label>
          <div className="grid gap-4 sm:grid-cols-2">{input('firstName', 'Nombre')}{input('lastName', 'Apellido')}
            {input('dni', 'DNI')}{input('telefono', 'Teléfono (opcional)', 'tel', false)}</div>
          {input('email', 'Correo electrónico', 'email')}
          <div className="grid gap-4 sm:grid-cols-2">{input('password', 'Contraseña (mín. 10 caracteres)', 'password')}{input('repeatPassword', 'Repetir contraseña', 'password')}</div>
          <p className="flex gap-2 rounded-xl border border-slate-600 bg-slate-800/60 p-3 text-xs text-slate-300"><ShieldCheck size={19} className="shrink-0"/> La aprobación depende del rol: directivos requieren superadministración; preceptores, dirección; docentes, dirección o preceptoría autorizada.</p>
          {error && <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold hover:bg-teal-500 disabled:opacity-50">{busy ? 'Enviando…' : 'Enviar solicitud y verificar correo'}</button>
        </form>}
      </div>
    </div>
  </main>;
}
