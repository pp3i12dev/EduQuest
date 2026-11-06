import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ChevronLeft, LoaderCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import logo from '../assets/images/logo2.png';
import { courseLabel } from '../utils/courseShift';

const initial = { institutionId: '', careerId: '', courseId: '', firstName: '', lastName: '', dni: '', email: '', telefono: '', password: '', repeatPassword: '' };
const fieldClass = 'w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950/75 px-3.5 py-3 text-sm text-white outline-none focus:border-sky-400 disabled:opacity-50';
function Field({ name, label, type = 'text', value, onChange, required = true, autoComplete, ...props }) {
  return <label className="block min-w-0 text-sm font-medium text-slate-200">{label}
    <input className={`mt-2 ${fieldClass}`} name={name} type={type} value={value} onChange={onChange}
      required={required} autoComplete={autoComplete} {...props} />
  </label>;
}
export default function StudentRegisterView() {
  const [values, setValues] = useState(initial);
  const [institutions, setInstitutions] = useState([]);
  const [careers, setCareers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [success, setSuccess] = useState(false);
  const field = event => { setValues(v => ({ ...v, [event.target.name]: event.target.value })); setError(''); };
  useEffect(() => {
    let active = true;
    api.get('/public/institutions').then(({data}) => { if (active) setInstitutions(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setLoadError('No se pudo obtener la lista de instituciones.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    setCareers([]); setCourses([]);
    setValues(v => ({ ...v, careerId: '', courseId: '' }));
    if (!values.institutionId) return;
    let active = true;
    api.get(`/public/institutions/${values.institutionId}/careers`)
      .then(({ data }) => { if (active) setCareers(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setLoadError('No se pudieron consultar los niveles/carreras.'); });
    return () => { active = false; };
  }, [values.institutionId]);
  useEffect(() => {
    setCourses([]); setValues(v => ({ ...v, courseId: '' }));
    if (!values.institutionId || !values.careerId) return;
    let active = true;
    // 'none' representa un curso sin carrera, común en instituciones primarias.
    api.get(`/public/institutions/${values.institutionId}/courses`, { params: { careerId: values.careerId } })
      .then(({ data }) => { if (active) setCourses(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setLoadError('No se pudieron cargar los cursos.'); });
    return () => { active = false; };
  }, [values.institutionId, values.careerId]);
  async function onSubmit(event) {
    event.preventDefault(); setError('');
    if (!values.institutionId || !values.careerId || !values.courseId) return setError('Seleccioná institución, nivel/carrera y curso.');
    if (values.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (values.password !== values.repeatPassword) return setError('Las contraseñas no coinciden.');
    setWorking(true);
    try {
      const { repeatPassword, ...payload } = values;
      await api.post('/auth/register-student', { ...payload,
        institutionId: Number(values.institutionId),
        courseId: Number(values.courseId),
        careerId: values.careerId === 'none' ? null : Number(values.careerId),
      });
      setSuccess(true);
    } catch (e) { setError(e.response?.data?.message || 'No pudimos completar el registro. Revisá tus datos.'); }
    finally { setWorking(false); }
  }
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-sky-300 hover:underline"><ChevronLeft size={18}/> Volver al inicio de sesión</Link>
        <div className="rounded-3xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl sm:p-9">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <img src={logo} alt="EduQuest" className="h-16 w-16 object-contain" />
            <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Registro de alumno</h1>
              <p className="mt-1 text-sm text-slate-300">Completá tus datos académicos y personales. Los demás roles se crean mediante invitación institucional.</p></div>
          </div>
          {success ? <div role="status" className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-emerald-100">
            <CheckCircle2 size={32} className="mb-3"/><h2 className="text-xl font-bold">Solicitud registrada</h2>
            <p className="mt-2 text-sm leading-6">Tu cuenta quedó pendiente de aprobación de la institución. Cuando esté activa, podrás iniciar sesión y elegir si querés recibir notificaciones en este dispositivo.</p>
            <Link to="/login" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-3 font-semibold">Volver a iniciar sesión</Link></div>
          : <form className="mt-7 space-y-6" onSubmit={onSubmit}>
            <fieldset className="space-y-4"><legend className="mb-4 flex items-center gap-2 text-lg font-bold"><GraduationCap size={20}/> 1. Datos académicos</legend>
              <label className="block text-sm font-medium text-slate-200">Institución
                <select name="institutionId" className={`mt-2 ${fieldClass}`} value={values.institutionId} onChange={field} required>
                  <option value="">Seleccioná la institución</option>{institutions.map(i => <option value={i.id} key={i.id}>{i.nombre}</option>)}
                </select></label>
              <label className="block text-sm font-medium text-slate-200">Nivel educativo o carrera
                <select name="careerId" className={`mt-2 ${fieldClass}`} value={values.careerId} onChange={field} disabled={!values.institutionId} required>
                  <option value="">Seleccioná nivel o carrera</option>
                  {careers.map(c => <option value={c.id} key={c.id}>{c.nombre} ({c.level})</option>)}
                  <option value="none">Cursos generales (sin carrera asignada)</option>
                </select></label>
              <p className="text-xs text-sky-200">El turno viene definido por el curso. No necesitás seleccionarlo por separado.</p>
              <label className="block text-sm font-medium text-slate-200">Curso
                <select name="courseId" className={`mt-2 ${fieldClass}`} value={values.courseId} onChange={field} disabled={!values.careerId} required>
                  <option value="">Seleccioná tu curso</option>{courses.map(c => <option value={c.id} key={c.id}>{courseLabel(c)}</option>)}
                </select></label>
            </fieldset>
            <fieldset className="space-y-4"><legend className="mb-4 text-lg font-bold">2. Datos personales</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="firstName" label="Nombre" value={values.firstName} onChange={field} autoComplete="given-name" maxLength={100}/>
                <Field name="lastName" label="Apellido" value={values.lastName} onChange={field} autoComplete="family-name" maxLength={100}/>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="dni" label="DNI" value={values.dni} onChange={field} inputMode="numeric" maxLength={12}/>
                <Field name="telefono" label="Teléfono (opcional)" value={values.telefono} onChange={field} type="tel" required={false} autoComplete="tel" maxLength={30}/>
              </div>
              <Field name="email" label="Correo electrónico" type="email" value={values.email} onChange={field} autoComplete="email" maxLength={200}/>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="password" label="Contraseña" type="password" value={values.password} onChange={field} autoComplete="new-password" minLength={8}/>
                <Field name="repeatPassword" label="Repetí la contraseña" type="password" value={values.repeatPassword} onChange={field} autoComplete="new-password" minLength={8}/>
              </div>
            </fieldset>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4 text-sm text-slate-200">
              <p className="font-bold">¿Y las notificaciones?</p>
              <p className="mt-2 leading-6">No te pediremos permiso durante este formulario. Tras la aprobación e inicio de sesión, podrás activar voluntariamente las notificaciones en tu dispositivo, desde el panel o Mi perfil. Los avisos siempre quedarán disponibles dentro de EduQuest.</p>
              <p className="mt-2 text-xs text-slate-300">Si sos menor de edad, realizá este registro con la asistencia de una persona adulta responsable.</p>
            </div>
            {(error || loadError) && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100"><AlertTriangle size={18}/>{error || loadError}</div>}
            <button type="submit" disabled={working} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-bold text-white hover:bg-blue-500 disabled:opacity-50">{working && <LoaderCircle size={18} className="animate-spin"/>} Solicitar registro</button>
          </form>}
        </div>
      </div>
    </main>
  );
}
