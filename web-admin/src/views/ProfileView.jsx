import { useContext, useEffect, useState } from 'react';
import {
    UserRound,
    ShieldCheck,
    Save,
    Eye,
    EyeOff,
    Mail,
    Phone,
    IdCard,
    BookOpen,
    LockKeyhole,
    CheckCircle2,
    AlertCircle,
    LoaderCircle,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import WebPushSettings from '../components/WebPushSettings';
import { directoryService } from '../services/directory.service';
import { displayLegajo } from '../utils/legajo';

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/$/, '');

const DIRECTORY_ROLE_OPTIONS = [
    { role: 'SUPER_ADMIN', label: 'Superadministradores' },
    { role: 'DIRECTOR', label: 'Directivos' },
    { role: 'PRECEPTOR', label: 'Preceptores' },
    { role: 'TEACHER', label: 'Docentes' },
    { role: 'STUDENT', label: 'Alumnos' },
];

const ROLE_LABELS = {
    SUPER_ADMIN: 'Superadministrador',
    DIRECTOR: 'Directivo',
    PRECEPTOR: 'Preceptor',
    TEACHER: 'Docente',
    STUDENT: 'Alumno',
};

function getErrorMessage(error) {
    return error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado';
}

async function requestProfile(path, token, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Error al procesar la solicitud (${response.status})`
        );
    }

    return data;
}

function FormField({
    label,
    value,
    onChange,
    type = 'text',
    disabled = false,
    icon: Icon,
    placeholder,
    autoComplete,
    maxLength,
    inputMode,
}) {
    return (
        <label className="block min-w-0">
            <span className="mb-2 block text-sm font-semibold text-slate-300">
                {label}
            </span>

            <div className="relative">
                {Icon && (
                    <Icon
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}

                <input
                    type={type}
                    value={value ?? ''}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    inputMode={inputMode}
                    className={`w-full min-w-0 rounded-xl border px-4 py-3 text-sm outline-none transition-colors ${Icon ? 'pl-11' : ''
                        } ${disabled
                            ? 'cursor-not-allowed border-slate-700 bg-slate-800/60 text-slate-400'
                            : 'border-slate-600 bg-slate-900 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15'
                        }`}
                />
            </div>
        </label>
    );
}

function PasswordField({
    label,
    value,
    onChange,
    visible,
    onToggle,
    autoComplete,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-300">
                {label}
            </span>

            <div className="relative">
                <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    required
                    className="w-full rounded-xl border border-slate-600 bg-slate-900 py-3 pl-11 pr-12 text-sm text-white outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />

                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={
                        visible
                            ? 'Ocultar contraseña'
                            : 'Mostrar contraseña'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:text-white"
                >
                    {visible ? (
                        <EyeOff size={19} />
                    ) : (
                        <Eye size={19} />
                    )}
                </button>
            </div>
        </label>
    );
}

function Feedback({ message, type }) {
    if (!message) return null;

    const success = type === 'success';

    return (
        <div
            role={success ? 'status' : 'alert'}
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
        >
            {success ? (
                <CheckCircle2 size={19} className="shrink-0" />
            ) : (
                <AlertCircle size={19} className="shrink-0" />
            )}

            <span>{message}</span>
        </div>
    );
}

function ProfileInfo({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 break-words text-sm font-medium text-slate-100">
                {value || 'No informado'}
            </p>
        </div>
    );
}

export default function ProfileView() {
    const {
        user,
        token,
        updateUserContext,
    } = useContext(AuthContext);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [directorySaving, setDirectorySaving] = useState(false);
    const [legajosSaving, setLegajosSaving] = useState(false);
    const [legajosFeedback, setLegajosFeedback] = useState(null);
    const [legajosForm, setLegajosForm] = useState({ legajoStudent: '', legajoTeacher: '', legajoPreceptor: '' });
    const [directoryMessage, setDirectoryMessage] = useState(null);
    const [directoryPrivacy, setDirectoryPrivacy] = useState({ directoryEmailRoles: [], directoryPhoneRoles: [] });
    const [directoryContact, setDirectoryContact] = useState({ directoryContactEmail: '', directoryContactPhone: '' });

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        telefono: '',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [passwordVisibility, setPasswordVisibility] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });

    const [profileFeedback, setProfileFeedback] = useState(null);
    const [passwordFeedback, setPasswordFeedback] = useState(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            setLoading(true);
            setLoadError('');

            try {
                const data = await requestProfile(
                    '/users/me',
                    token
                );

                if (cancelled) return;

                setProfile(data);
                setLegajosForm({
                    legajoStudent: displayLegajo(data.profiles?.student?.legajoStudent),
                    legajoTeacher: displayLegajo(data.profiles?.teacher?.legajoTeacher),
                    legajoPreceptor: displayLegajo(data.profiles?.preceptor?.legajoPreceptor),
                });
                setDirectoryPrivacy({
                    directoryEmailRoles: Array.isArray(data.directoryEmailRoles) ? data.directoryEmailRoles : [],
                    directoryPhoneRoles: Array.isArray(data.directoryPhoneRoles) ? data.directoryPhoneRoles : [],
                });
                setDirectoryContact({
                    directoryContactEmail: data.directoryContactEmail ?? data.email ?? '',
                    directoryContactPhone: data.directoryContactPhone ?? data.telefono ?? '',
                });

                setForm({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    telefono: data.telefono || '',
                });
            } catch (error) {
                if (!cancelled) {
                    setLoadError(getErrorMessage(error));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        if (token) {
            loadProfile();
        } else {
            setLoading(false);
            setLoadError('No hay una sesión activa.');
        }

        return () => {
            cancelled = true;
        };
    }, [token]);

    const handleProfileChange = (field, value) => {
        setForm(current => ({
            ...current,
            [field]: value,
        }));

        setProfileFeedback(null);
    };

    const handleSaveProfile = async event => {
        event.preventDefault();

        setProfileFeedback(null);

        const telefono = form.telefono.trim();

        // Validación inicial de caracteres.
        // El backend realiza la validación definitiva.
        if (telefono && !/^\+?[\d\s().-]+$/.test(telefono)) {
            setProfileFeedback({
                type: 'error',
                message:
                    'El teléfono solo puede contener números, espacios, paréntesis, guiones y el prefijo +54.',
            });
            return;
        }

        if (telefono.length > 35) {
            setProfileFeedback({
                type: 'error',
                message: 'El teléfono es demasiado largo.',
            });
            return;
        }

        setSaving(true);

        try {
            const updated = await requestProfile(
                '/users/me',
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        firstName: form.firstName.trim(),
                        lastName: form.lastName.trim(),
                        email: form.email.trim(),
                        telefono,
                    }),
                }
            );

            setProfile(updated);

            setForm({
                firstName: updated.firstName || '',
                lastName: updated.lastName || '',
                email: updated.email || '',
                telefono: updated.telefono || '',
            });

            updateUserContext?.({
                firstName: updated.firstName,
                lastName: updated.lastName,
                email: updated.email,
                telefono: updated.telefono ?? null,
            });

            setProfileFeedback({
                type: 'success',
                message:
                    'Tus datos personales se actualizaron correctamente.',
            });
        } catch (error) {
            setProfileFeedback({
                type: 'error',
                message: getErrorMessage(error),
            });
        } finally {
            setSaving(false);
        }
    };

    const saveMyLegajos = async (event) => {
        event.preventDefault();
        setLegajosFeedback(null);
        const fieldToProfile = { legajoStudent: 'student', legajoTeacher: 'teacher', legajoPreceptor: 'preceptor' };
        const updates = {};
        for (const [field, role] of Object.entries(fieldToProfile)) {
            if (!profile?.profiles?.[role]) continue;
            const provided = legajosForm[field].trim();
            const previous = displayLegajo(profile.profiles[role][field]);
            if (provided !== previous) {
                if (!provided) {
                    setLegajosFeedback({ type: 'error', message: 'Para conservar el legajo actual, dejalo sin modificar. No se puede borrar un legajo oficial desde este formulario.' });
                    return;
                }
                updates[field] = provided;
            }
        }
        if (!Object.keys(updates).length) {
            setLegajosFeedback({ type: 'success', message: 'No hay legajos nuevos para guardar.' });
            return;
        }
        setLegajosSaving(true);
        try {
            const result = await requestProfile('/users/me/legajos', token, {
                method: 'PATCH', body: JSON.stringify(updates),
            });
            setProfile(result);
            setLegajosForm({
                legajoStudent: displayLegajo(result.profiles?.student?.legajoStudent),
                legajoTeacher: displayLegajo(result.profiles?.teacher?.legajoTeacher),
                legajoPreceptor: displayLegajo(result.profiles?.preceptor?.legajoPreceptor),
            });
            setLegajosFeedback({ type: 'success', message: 'Legajo institucional actualizado.' });
        } catch (error) {
            setLegajosFeedback({ type: 'error', message: getErrorMessage(error) });
        } finally {
            setLegajosSaving(false);
        }
    };

    const toggleDirectoryRole = (field, role) => {
        setDirectoryPrivacy(current => ({
            ...current,
            [field]: current[field].includes(role)
                ? current[field].filter(existing => existing !== role)
                : [...current[field], role],
        }));
        setDirectoryMessage(null);
    };

    const saveDirectoryPrivacy = async event => {
        event.preventDefault();
        setDirectorySaving(true);
        setDirectoryMessage(null);
        try {
            const result = await directoryService.updatePrivacy({
                ...directoryPrivacy,
                directoryContactEmail: directoryContact.directoryContactEmail.trim(),
                directoryContactPhone: directoryContact.directoryContactPhone.trim(),
            });
            setDirectoryPrivacy({
                directoryEmailRoles: result.directoryEmailRoles,
                directoryPhoneRoles: result.directoryPhoneRoles,
            });
            setDirectoryContact({
                directoryContactEmail: result.directoryContactEmail,
                directoryContactPhone: result.directoryContactPhone,
            });
            setProfile(current => ({ ...current, ...result }));
            setDirectoryMessage({ type: 'success', message: 'Datos de contacto y permisos de privacidad guardados.' });
        } catch (error) {
            setDirectoryMessage({ type: 'error', message: error.response?.data?.message || 'No se pudieron guardar los datos compartidos.' });
        } finally { setDirectorySaving(false); }
    };

    const handlePasswordChange = (field, value) => {
        setPasswordForm(current => ({
            ...current,
            [field]: value,
        }));

        setPasswordFeedback(null);
    };

    const handleChangePassword = async event => {
        event.preventDefault();

        if (
            passwordForm.newPassword !==
            passwordForm.confirmPassword
        ) {
            setPasswordFeedback({
                type: 'error',
                message: 'Las contraseñas nuevas no coinciden.',
            });
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setPasswordFeedback({
                type: 'error',
                message:
                    'La contraseña debe tener al menos 8 caracteres.',
            });
            return;
        }

        setChangingPassword(true);
        setPasswordFeedback(null);

        try {
            const result = await requestProfile(
                '/users/me/password',
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify(passwordForm),
                }
            );

            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            setPasswordVisibility({
                currentPassword: false,
                newPassword: false,
                confirmPassword: false,
            });

            setPasswordFeedback({
                type: 'success',
                message:
                    result?.message ||
                    'Contraseña actualizada correctamente.',
            });
        } catch (error) {
            setPasswordFeedback({
                type: 'error',
                message: getErrorMessage(error),
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const togglePasswordVisibility = field => {
        setPasswordVisibility(current => ({
            ...current,
            [field]: !current[field],
        }));
    };

    if (loading) {
        return (
            <div className="flex min-h-80 items-center justify-center gap-3 text-slate-200">
                <LoaderCircle className="animate-spin" size={24} />
                Cargando tu perfil...
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mx-auto max-w-3xl">
                <Feedback message={loadError} type="error" />
            </div>
        );
    }

    if (!profile) return null;

    const fullName = [
        profile.firstName,
        profile.lastName,
    ].filter(Boolean).join(' ');

    const initials = [
        profile.firstName?.[0],
        profile.lastName?.[0],
    ].filter(Boolean).join('').toUpperCase() || 'U';

    const roles = Array.isArray(profile.roles)
        ? profile.roles
        : [];

    const profiles = profile.profiles || {};

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-10">

            {/* ENCABEZADO DEL PERFIL */}
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-xl">
                <div className="h-24 bg-gradient-to-r from-blue-900 via-slate-800 to-cyan-900 sm:h-32" />

                <div className="px-5 pb-6 sm:px-8">
                    <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-slate-900 bg-blue-600 text-2xl font-bold text-white shadow-lg">
                            {initials}
                        </div>

                        <div className="min-w-0 flex-1 sm:pb-1">
                            <h1 className="break-words text-2xl font-bold text-white">
                                {fullName || user?.firstName || 'Mi perfil'}
                            </h1>

                            <p className="mt-1 break-all text-sm text-slate-400">
                                {profile.email}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {roles.map(role => (
                            <span
                                key={role}
                                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300"
                            >
                                {ROLE_LABELS[role] || role}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <section className="mb-6 rounded-2xl border border-teal-500/25 bg-[#173149]/90 p-5 shadow-lg sm:p-6" aria-label="Privacidad del directorio">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white"><ShieldCheck size={22} className="text-teal-300"/> Privacidad de mi contacto</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-300">Elegí qué correo y teléfono querés compartir en el directorio y qué roles pueden ver cada uno. Se completaron inicialmente con los datos de registro; cambiarlos aquí no modifica tu correo de acceso, tus notificaciones ni tus datos privados.</p>
                <form onSubmit={saveDirectoryPrivacy} className="mt-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                    {[
                        { field: 'directoryEmailRoles', contactField: 'directoryContactEmail', label: 'Correo electrónico para compartir', type: 'email', Icon: Mail },
                        { field: 'directoryPhoneRoles', contactField: 'directoryContactPhone', label: 'Teléfono para compartir', type: 'tel', Icon: Phone },
                    ].map(({ field, contactField, label, type, Icon }) => (
                        <fieldset key={field} className="rounded-2xl border border-slate-600/70 bg-slate-900/60 p-4">
                            <legend className="px-1 text-sm font-bold text-white">
                                <span className="inline-flex items-center gap-2"><Icon size={17} className="text-teal-300" /> {label}</span>
                            </legend>
                            <label className="mb-4 block">
                                <span className="mb-2 block text-xs font-medium text-slate-300">Dato visible en el directorio</span>
                                <input
                                    type={type}
                                    value={directoryContact[contactField]}
                                    onChange={event => {
                                        setDirectoryContact(current => ({ ...current, [contactField]: event.target.value }));
                                        setDirectoryMessage(null);
                                    }}
                                    maxLength={type === 'email' ? 254 : 35}
                                    placeholder={type === 'email' ? 'contacto@institucion.edu.ar' : '+54 221 456-7890'}
                                    autoComplete="off"
                                    className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                                />
                            </label>
                            <p className="mb-3 mt-1 text-xs text-slate-400">Seleccioná exactamente qué roles pueden ver este dato.</p>
                            <div className="space-y-2">
                                {DIRECTORY_ROLE_OPTIONS.map(({ role, label: roleLabel }) => (
                                    <label key={role} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800/70">
                                        <input
                                            type="checkbox"
                                            checked={directoryPrivacy[field].includes(role)}
                                            onChange={() => toggleDirectoryRole(field, role)}
                                            className="h-4 w-4 accent-teal-500"
                                        />
                                        {roleLabel}
                                    </label>
                                ))}
                            </div>
                            {!directoryPrivacy[field].length && (
                                <p className="mt-3 text-xs font-medium text-amber-300">Privado: nadie puede consultar este dato en el directorio.</p>
                            )}
                        </fieldset>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={directorySaving} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-40">{directorySaving ? 'Guardando…' : 'Guardar contacto y privacidad'}</button>
                    {directoryMessage && <span role={directoryMessage.type === 'error' ? 'alert' : 'status'} className={directoryMessage.type==='error'?'text-sm text-rose-300':'text-sm text-teal-200'}>{directoryMessage.message}</span>}
                </div>
                <p className="text-xs leading-relaxed text-slate-400">Si vaciás un campo, ese dato no se mostrará a nadie aunque haya casillas seleccionadas. Los contactos compartidos pueden ser distintos de los utilizados para acceder a EduQuest. Un correo alternativo no se verifica automáticamente.</p>
                </form>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

                {/* DATOS PERSONALES */}
                <section className="rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-lg sm:p-7 lg:col-span-3">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                            <UserRound size={23} />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-white">
                                Datos personales
                            </h2>

                            <p className="text-sm text-slate-400">
                                Actualizá tu información de contacto.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSaveProfile}
                        className="space-y-5"
                    >
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <FormField
                                label="Nombre"
                                value={form.firstName}
                                onChange={event =>
                                    handleProfileChange(
                                        'firstName',
                                        event.target.value
                                    )
                                }
                                autoComplete="given-name"
                            />

                            <FormField
                                label="Apellido"
                                value={form.lastName}
                                onChange={event =>
                                    handleProfileChange(
                                        'lastName',
                                        event.target.value
                                    )
                                }
                                autoComplete="family-name"
                            />
                        </div>

                        <FormField
                            label="Correo electrónico"
                            type="email"
                            icon={Mail}
                            value={form.email}
                            onChange={event =>
                                handleProfileChange(
                                    'email',
                                    event.target.value
                                )
                            }
                            autoComplete="email"
                            placeholder="nombre@ejemplo.com"
                        />

                        {/* NUEVO CAMPO: TELÉFONO */}
                        <div>
                            <FormField
                                label="Teléfono (opcional)"
                                type="tel"
                                icon={Phone}
                                value={form.telefono}
                                onChange={event =>
                                    handleProfileChange(
                                        'telefono',
                                        event.target.value
                                    )
                                }
                                placeholder="+54 9 221 456-7890"
                                autoComplete="tel"
                                inputMode="tel"
                                maxLength={35}
                            />

                            <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                Podés ingresar un teléfono fijo o celular
                                argentino, con o sin prefijo internacional.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
                                    Fijo: 221 456-7890
                                </span>

                                <span className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
                                    Celular: 221 15-456-7890
                                </span>

                                <span className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300">
                                    Internacional: +54 9 221 456-7890
                                </span>
                            </div>
                        </div>

                        <FormField
                            label="DNI"
                            icon={IdCard}
                            value={profile.dni}
                            disabled
                        />

                        <p className="text-xs leading-relaxed text-slate-400">
                            El DNI y los datos institucionales no pueden
                            modificarse desde esta pantalla.
                        </p>

                        <Feedback
                            message={profileFeedback?.message}
                            type={profileFeedback?.type}
                        />

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {saving ? (
                                <LoaderCircle
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={18} />
                            )}

                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </form>
                </section>

                {/* LEGAJOS INSTITUCIONALES - voluntarios y editables por cada persona */}
                {(profiles.teacher || profiles.student || profiles.preceptor) && (
                    <section className="rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-lg sm:p-7 lg:col-span-2">
                        <h2 className="text-lg font-bold text-white">Legajos institucionales</h2>
                        <p className="mt-2 text-sm text-slate-400">No son obligatorios para registrarse. Si tu institución te asignó un legajo oficial, podés incorporarlo acá más adelante. No se mostrará el identificador técnico provisional.</p>
                        <form onSubmit={saveMyLegajos} className="mt-5 space-y-4">
                            {profiles.student && <FormField label="Legajo de alumno (opcional)" value={legajosForm.legajoStudent} placeholder="Pendiente de completar" onChange={e => { setLegajosForm(f => ({...f, legajoStudent: e.target.value })); setLegajosFeedback(null); }} maxLength={70} />}
                            {profiles.teacher && <FormField label="Legajo docente (opcional)" value={legajosForm.legajoTeacher} placeholder="Pendiente de completar" onChange={e => { setLegajosForm(f => ({...f, legajoTeacher: e.target.value })); setLegajosFeedback(null); }} maxLength={70} />}
                            {profiles.preceptor && <FormField label="Legajo de preceptor (opcional)" value={legajosForm.legajoPreceptor} placeholder="Pendiente de completar" onChange={e => { setLegajosForm(f => ({...f, legajoPreceptor: e.target.value })); setLegajosFeedback(null); }} maxLength={70} />}
                            <Feedback message={legajosFeedback?.message} type={legajosFeedback?.type} />
                            <button type="submit" disabled={legajosSaving} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60">
                                <Save size={17} />{legajosSaving ? 'Guardando…' : 'Guardar legajos'}
                            </button>
                        </form>
                    </section>
                )}

                {/* INFORMACIÓN INSTITUCIONAL */}
                <section className="rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-lg sm:p-7 lg:col-span-2">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                            <BookOpen size={23} />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-white">
                                Información institucional
                            </h2>

                            <p className="text-sm text-slate-400">
                                Datos asociados a tus roles.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {profiles.teacher && (
                            <>
                                <ProfileInfo
                                    label="Legajo docente"
                                    value={displayLegajo(profiles.teacher.legajoTeacher)}
                                />

                                <ProfileInfo
                                    label="Especialidad"
                                    value={profiles.teacher.specialty}
                                />
                            </>
                        )}

                        {profiles.student && (
                            <ProfileInfo
                                label="Legajo de alumno"
                                value={displayLegajo(profiles.student.legajoStudent)}
                            />
                        )}

                        {profiles.preceptor && (
                            <>
                                <ProfileInfo
                                    label="Legajo de preceptor"
                                    value={displayLegajo(profiles.preceptor.legajoPreceptor)}
                                />

                                <ProfileInfo
                                    label="Turno"
                                    value={profiles.preceptor.shift}
                                />
                            </>
                        )}

                        {profiles.director && (
                            <ProfileInfo
                                label="Cargo directivo"
                                value={profiles.director.position}
                            />
                        )}

                        <ProfileInfo
                            label="Institución"
                            value={
                                profile.institutionId != null
                                    ? `ID ${profile.institutionId}`
                                    : 'Sin institución asignada'
                            }
                        />

                        <ProfileInfo
                            label="Estado de la cuenta"
                            value={
                                profile.isActive
                                    ? 'Activa'
                                    : 'Inactiva'
                            }
                        />
                    </div>
                </section>
            </div>

            <WebPushSettings />
            {/* SEGURIDAD DE LA CUENTA */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-lg sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
                        <ShieldCheck size={24} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Seguridad de la cuenta
                        </h2>

                        <p className="text-sm text-slate-400">
                            Cambiá tu contraseña de acceso a EduQuest.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleChangePassword}
                    className="max-w-2xl space-y-5"
                >
                    <PasswordField
                        label="Contraseña actual"
                        value={passwordForm.currentPassword}
                        onChange={event =>
                            handlePasswordChange(
                                'currentPassword',
                                event.target.value
                            )
                        }
                        visible={passwordVisibility.currentPassword}
                        onToggle={() =>
                            togglePasswordVisibility('currentPassword')
                        }
                        autoComplete="current-password"
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <PasswordField
                            label="Nueva contraseña"
                            value={passwordForm.newPassword}
                            onChange={event =>
                                handlePasswordChange(
                                    'newPassword',
                                    event.target.value
                                )
                            }
                            visible={passwordVisibility.newPassword}
                            onToggle={() =>
                                togglePasswordVisibility('newPassword')
                            }
                            autoComplete="new-password"
                        />

                        <PasswordField
                            label="Confirmar nueva contraseña"
                            value={passwordForm.confirmPassword}
                            onChange={event =>
                                handlePasswordChange(
                                    'confirmPassword',
                                    event.target.value
                                )
                            }
                            visible={passwordVisibility.confirmPassword}
                            onToggle={() =>
                                togglePasswordVisibility('confirmPassword')
                            }
                            autoComplete="new-password"
                        />
                    </div>

                    <p className="text-xs text-slate-400">
                        Utilizá una contraseña de al menos 8 caracteres.
                        Recomendamos combinar letras, números y símbolos.
                    </p>

                    <Feedback
                        message={passwordFeedback?.message}
                        type={passwordFeedback?.type}
                    />

                    <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        {changingPassword ? (
                            <LoaderCircle
                                size={18}
                                className="animate-spin"
                            />
                        ) : (
                            <LockKeyhole size={18} />
                        )}

                        {changingPassword
                            ? 'Actualizando contraseña...'
                            : 'Cambiar contraseña'}
                    </button>
                </form>
            </section>
        </div>
    );
}
