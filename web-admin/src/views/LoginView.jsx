
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
    ArrowRight,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    ShieldCheck,
    AlertCircle,
    LoaderCircle,
    KeyRound,
    GraduationCap,
    Sparkles,
    X,
} from 'lucide-react';

import { useLogin } from '../hooks/useAuth';
import logo from '../assets/images/logo2.png';
import BackgroundLayout from '../layouts/BackgroundLayout';

export default function LoginView() {
    const [showPassword, setShowPassword] = useState(false);
    const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const loginMutation = useLogin();

    const onSubmit = (data) => {
        setShowRecoveryNotice(false);
        loginMutation.mutate(data);
    };

    const errorMessage =
        loginMutation.error?.response?.data?.message ||
        loginMutation.error?.response?.data?.error ||
        'No pudimos iniciar sesión. Verificá tus credenciales e intentá nuevamente.';

    const inputBase =
        'w-full rounded-xl border bg-slate-950/65 py-3.5 pl-12 pr-12 text-sm text-white shadow-sm outline-none backdrop-blur-sm transition-all placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10';

    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">

            {/* FONDO ORIGINAL */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <BackgroundLayout />
            </div>

            {/* CAPAS VISUALES */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/65" />

            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/90" />

            <div className="pointer-events-none absolute left-1/2 top-[40%] z-0 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[110px]" />

            {/* HEADER */}
            <header className="relative z-10 w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
                <div className="mx-auto flex min-h-[86px] w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">

                    <div className="flex items-center gap-3">
                        <img
                            src={logo}
                            alt="EduQuest"
                            className="h-12 w-auto max-w-[115px] object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.25)] sm:h-14"
                        />

                        <div className="hidden border-l border-slate-700 pl-4 sm:block">
                            <p className="text-sm font-semibold tracking-wide text-slate-100">
                                Plataforma educativa
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                                Aprendizaje y gestión académica
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300">
                        <GraduationCap size={16} />
                        <span className="hidden sm:inline">
                            Portal de acceso
                        </span>
                        <span className="sm:hidden">
                            Acceso
                        </span>
                    </div>
                </div>
            </header>

            {/* CONTENIDO CENTRAL */}
            <main className="relative z-10 flex w-full flex-1 items-center justify-center px-5 py-12 sm:px-8 sm:py-16">

                <div className="flex w-full max-w-[440px] flex-col items-center">

                    {/* IDENTIDAD Y BIENVENIDA */}
                    <div className="mb-9 flex w-full flex-col items-center text-center">

                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-300 shadow-[0_0_35px_rgba(59,130,246,0.12)] backdrop-blur-md">
                            <LockKeyhole
                                size={29}
                                strokeWidth={1.6}
                            />
                        </div>

                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
                            <Sparkles
                                size={13}
                                className="text-blue-400"
                            />
                            Tu espacio de aprendizaje
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[38px]">
                            Bienvenido a{' '}
                            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                EduQuest
                            </span>
                        </h1>

                        <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300 sm:text-base">
                            Todo comienza con un nuevo desafío.
                            Ingresá con tus credenciales para continuar.
                        </p>
                    </div>

                    {/* FORMULARIO SIN TARJETA EXTERIOR */}
                    <div className="w-full">

                        {/* ERROR DEL SERVIDOR */}
                        {loginMutation.isError && (
                            <div
                                role="alert"
                                className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200 backdrop-blur-md"
                            >
                                <AlertCircle
                                    size={19}
                                    className="mt-0.5 shrink-0 text-red-400"
                                />

                                <div>
                                    <p className="font-semibold">
                                        No se pudo iniciar sesión
                                    </p>

                                    <p className="mt-1 leading-relaxed text-red-200/80">
                                        {errorMessage}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* AVISO DE RECUPERACIÓN */}
                        {showRecoveryNotice && (
                            <div
                                role="status"
                                className="mb-6 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-950/60 p-4 text-sm text-blue-200 backdrop-blur-md"
                            >
                                <KeyRound
                                    size={19}
                                    className="mt-0.5 shrink-0 text-blue-400"
                                />

                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                        Recuperación de contraseña
                                    </p>

                                    <p className="mt-1 leading-relaxed text-blue-200/80">
                                        Esta funcionalidad estará disponible próximamente.
                                        Por ahora, contactá al administrador de tu institución
                                        si necesitás recuperar el acceso.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowRecoveryNotice(false)}
                                    aria-label="Cerrar aviso"
                                    className="cursor-pointer rounded-md p-1 text-blue-300 hover:bg-blue-500/20 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                            className="space-y-5"
                        >
                            {/* CORREO */}
                            <div>
                                <label
                                    htmlFor="login-email"
                                    className="mb-2 block text-sm font-medium text-slate-200"
                                >
                                    Correo electrónico
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={19}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="login-email"
                                        type="email"
                                        autoComplete="username"
                                        placeholder="Ingresá tu correo electrónico"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email
                                                ? 'login-email-error'
                                                : undefined
                                        }
                                        {...register('email', {
                                            required: 'El correo electrónico es obligatorio.',
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: 'Ingresá un correo electrónico válido.',
                                            },
                                        })}
                                        className={`${inputBase} ${errors.email
                                                ? 'border-red-500/70'
                                                : 'border-slate-600/80 hover:border-slate-500'
                                            }`}
                                    />
                                </div>

                                {errors.email && (
                                    <p
                                        id="login-email-error"
                                        className="mt-2 text-xs text-red-400"
                                    >
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* CONTRASEÑA */}
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <label
                                        htmlFor="login-password"
                                        className="text-sm font-medium text-slate-200"
                                    >
                                        Contraseña
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowRecoveryNotice(true)
                                        }
                                        className="cursor-pointer text-xs font-medium text-blue-400 transition-colors hover:text-cyan-300 hover:underline"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                <div className="relative">
                                    <LockKeyhole
                                        size={19}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="login-password"
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        autoComplete="current-password"
                                        placeholder="Ingresá tu contraseña"
                                        aria-invalid={Boolean(errors.password)}
                                        aria-describedby={
                                            errors.password
                                                ? 'login-password-error'
                                                : undefined
                                        }
                                        {...register('password', {
                                            required: 'La contraseña es obligatoria.',
                                        })}
                                        className={`${inputBase} ${errors.password
                                                ? 'border-red-500/70'
                                                : 'border-slate-600/80 hover:border-slate-500'
                                            }`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        aria-label={
                                            showPassword
                                                ? 'Ocultar contraseña'
                                                : 'Mostrar contraseña'
                                        }
                                        aria-pressed={showPassword}
                                        title={
                                            showPassword
                                                ? 'Ocultar contraseña'
                                                : 'Mostrar contraseña'
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>
                                </div>

                                {errors.password && (
                                    <p
                                        id="login-password-error"
                                        className="mt-2 text-xs text-red-400"
                                    >
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* INGRESAR */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loginMutation.isPending}
                                    className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-sm font-bold text-white shadow-[0_8px_30px_rgba(37,99,235,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-400 hover:shadow-[0_12px_35px_rgba(37,99,235,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                                >
                                    {loginMutation.isPending ? (
                                        <>
                                            <LoaderCircle
                                                size={20}
                                                className="animate-spin"
                                            />
                                            Ingresando...
                                        </>
                                    ) : (
                                        <>
                                            Iniciar sesión
                                            <ArrowRight
                                                size={19}
                                                className="transition-transform group-hover:translate-x-1"
                                            />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* NOTA DE SEGURIDAD */}
                        <div className="mt-8 flex items-center justify-center gap-2 text-center">
                            <ShieldCheck
                                size={16}
                                className="shrink-0 text-emerald-400"
                            />

                            <p className="text-xs text-slate-400">
                                Acceso exclusivo para usuarios autorizados
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* FOOTER */}
            <footer className="relative z-10 w-full border-t border-white/10 bg-slate-950/55 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12">

                    <div className="flex items-center gap-2">
                        <GraduationCap
                            size={17}
                            className="text-blue-400"
                        />

                        <span className="text-xs font-semibold tracking-wide text-slate-300">
                            EduQuest
                        </span>

                        <span className="text-xs text-slate-600">
                            © {new Date().getFullYear()}
                        </span>
                    </div>

                    <p className="text-xs text-slate-400">
                        Aprendé. Superate. Alcanzá nuevas metas.
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Plataforma de gestión educativa
                    </div>
                </div>
            </footer>
        </div>
    );
}
