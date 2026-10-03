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
        setIsSaving(true);

        // Solo mandamos los campos que corresponden al rol
        const payload = {
            firstName: form.firstName,
            lastName: form.lastName,
            dni: form.dni,
            password: form.password,
            ...(['TEACHER', 'PRECEPTOR', 'STUDENT'].includes(invitation.role) && { legajo: form.legajo }),
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
                    <button onClick={() => navigate('/login')} className="text-sm text-purple-400 hover:underline">
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
                    <h2 className="text-lg font-semibold">¡Cuenta creada!</h2>
                    <p className="text-sm text-slate-400">Te estamos llevando al login...</p>
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
                </div>

                <input className={inputClass} placeholder="Nombre" value={form.firstName}
                    onChange={setField('firstName')} required />
                <input className={inputClass} placeholder="Apellido" value={form.lastName}
                    onChange={setField('lastName')} required />
                <input className={inputClass} placeholder="DNI" value={form.dni}
                    onChange={setField('dni')} required />
                <input className={inputClass} type="password" placeholder="Contraseña" value={form.password}
                    onChange={setField('password')} required minLength={8} />

                {['TEACHER', 'PRECEPTOR', 'STUDENT'].includes(invitation.role) && (
                    <input className={inputClass} placeholder="Legajo" value={form.legajo}
                        onChange={setField('legajo')} required />
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
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                >
                    {isSaving ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
            </form>
        </div>
    );
}