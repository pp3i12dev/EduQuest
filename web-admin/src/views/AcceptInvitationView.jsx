import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ROLE_LABELS = {
    DIRECTOR: 'Directivo',
    PRECEPTOR: 'Preceptor',
    TEACHER: 'Docente',
    STUDENT: 'Alumno',
};

const inputClass =
    'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm';

export default function AcceptInvitationView() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [invitation, setInvitation] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        dni: '',
        password: '',
        confirmPassword: '',
        legajo: '',
        specialty: '',
        shift: '',
        position: '',
    });
    const [submitError, setSubmitError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/invitations/${token}`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || data.error || 'Invitación inválida');
                setInvitation(data);
            } catch (err) {
                setLoadError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        if (form.password !== form.confirmPassword) { setSubmitError('Las contraseñas no coinciden.'); return; }
        setIsSaving(true);

        // Solo mandamos los campos que corresponden al rol
        const payload = {
            firstName: form.firstName,
            lastName: form.lastName,
            dni: form.dni,
            password: form.password,
            ...(['TEACHER', 'PRECEPTOR', 'STUDENT'].includes(invitation.role) && form.legajo.trim() && { legajo: form.legajo.trim() }),
            ...(invitation.role === 'TEACHER' && { specialty: form.specialty }),
            ...(invitation.role === 'PRECEPTOR' && { shift: form.shift }),
            ...(invitation.role === 'DIRECTOR' && { position: form.position }),
        };

        try {
            const res = await fetch(`${API_URL}/invitations/${token}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || data.error || 'No se pudo crear la cuenta');
            setDone(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const wrapper = 'min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4';

    if (loading) {
        return <div className={wrapper}><p className="text-slate-400">Verificando invitación...</p></div>;
    }

    if (loadError) {
        return (
            <div className={wrapper}>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm text-center space-y-3">
                    <h2 className="text-lg font-semibold">No se puede usar esta invitación</h2>
                    <p className="text-sm text-red-400">{loadError}</p>
                    <button onClick={() => navigate('/login')} className="text-sm text-blue-400 hover:underline">
                        Ir al login
                    </button>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className={wrapper}>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm text-center space-y-2">
                    <h2 className="text-lg font-semibold">¡Invitación aceptada!</h2>
                    <p className="text-sm text-slate-400">Tu cuenta ya está activa. Podés iniciar sesión sin esperar aprobación. Te estamos llevando al login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={wrapper}>
            <form
                onSubmit={handleSubmit}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4"
            >
                <div>
                    <h2 className="text-lg font-semibold">Completá tu registro</h2>
                    <p className="text-sm text-slate-400">
                        {invitation.email} · {ROLE_LABELS[invitation.role]}
                    </p>
                    <p className="mt-1 text-xs text-cyan-300">{invitation.institutionName}{invitation.courseName ? ` · Curso: ${invitation.courseName}` : ''} · Alta directa, sin aprobación adicional</p>
                </div>

                <input className={inputClass} placeholder="Nombre" value={form.firstName}
                    onChange={setField('firstName')} required />
                <input className={inputClass} placeholder="Apellido" value={form.lastName}
                    onChange={setField('lastName')} required />
                <input className={inputClass} placeholder="DNI" value={form.dni}
                    onChange={setField('dni')} required />
                <input className={inputClass} type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={form.password}
                    autoComplete="new-password" onChange={setField('password')} required minLength={8} maxLength={72} />
                <input className={inputClass} type="password" placeholder="Repetí la contraseña" value={form.confirmPassword}
                    autoComplete="new-password" onChange={setField('confirmPassword')} required minLength={8} maxLength={72} />
                {form.confirmPassword && form.password !== form.confirmPassword && <p role="alert" className="text-xs text-rose-300">Las contraseñas no coinciden.</p>}

                {['TEACHER', 'PRECEPTOR', 'STUDENT'].includes(invitation.role) && (
                    <label className="block text-sm text-slate-200">
                        Legajo (opcional)
                        <input className={`${inputClass} mt-1`} placeholder="Podés dejarlo en blanco" value={form.legajo}
                            onChange={setField('legajo')} />
                        <span className="mt-1 block text-xs text-slate-400">Podrás completar el legajo oficial desde Mi perfil después de ingresar.</span>
                    </label>
                )}
                {invitation.role === 'TEACHER' && (
                    <input className={inputClass} placeholder="Especialidad" value={form.specialty}
                        onChange={setField('specialty')} />
                )}
                {invitation.role === 'PRECEPTOR' && (
                    <input className={inputClass} placeholder="Turno" value={form.shift}
                        onChange={setField('shift')} />
                )}
                {invitation.role === 'DIRECTOR' && (
                    <input className={inputClass} placeholder="Cargo" value={form.position}
                        onChange={setField('position')} />
                )}

                {submitError && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                        {submitError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isSaving || form.password !== form.confirmPassword}
                    className="w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                    {isSaving ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
            </form>
        </div>
    );
}