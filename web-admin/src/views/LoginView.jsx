import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import InstallPwaButton from '../components/InstallPwaButton';

export default function LoginView() {
    const [showPassword, setShowPassword] = useState(false);

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
        loginMutation.mutate(data);
    };

    const errorMessage =
        loginMutation.error?.response?.data?.message ||
        loginMutation.error?.response?.data?.error ||
        'No pudimos iniciar sesión. Verificá tus credenciales e intentá nuevamente.';

    const inputBase =
        'w-full rounded-xl border bg-slate-950/65 py-3 pl-12 pr-12 text-sm text-white shadow-sm outline-none backdrop-blur-sm transition-all placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10';

    return (
        <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-slate-950 text-white">

            {/* FONDO ORIGINAL */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <BackgroundLayout />
            </div>

            {/* CAPAS VISUALES */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-slate-950/65" />

            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/90" />

            <div className="pointer-events-none absolute left-1/2 top-[40%] z-0 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[110px]" />

            {/* CONTENIDO CENTRAL */}
            <main className="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-5 sm:px-8 sm:py-6">

                <div className="flex w-full max-w-[410px] flex-col items-center">

                    {/* Una sola cabecera, integrada al formulario para aprovechar la altura móvil. */}
                    <div className="mb-5 flex w-full flex-col items-center text-center sm:mb-6">
                        <img src={logo} alt="EduQuest" className="mb-2 h-14 w-auto max-w-[145px] object-contain sm:h-16" />
                        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                            Bienvenido a <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">EduQuest</span>
                        </h1>
                        <p className="mt-1.5 text-sm leading-5 text-slate-300">Ingresá a tu espacio educativo.</p>
                    </div>

                    {/* FORMULARIO SIN TARJETA EXTERIOR */}
                    <div className="w-full">

                        {/* ERROR DEL SERVIDOR */}
                        {loginMutation.isError && (
                            <div
                                role="alert"
                                className="mb-3 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200 backdrop-blur-md"
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

                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                            className="space-y-3"
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

                                    <Link to="/olvide-contrasena" className="cursor-pointer text-xs font-medium text-blue-400 transition-colors hover:text-cyan-300 hover:underline">¿Olvidaste tu contraseña?</Link>
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
                                    className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_30px_rgba(37,99,235,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-400 hover:shadow-[0_12px_35px_rgba(37,99,235,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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

                        <div className="mt-4 rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-center">
                            <p className="text-sm font-semibold text-white">¿Sos alumno y todavía no tenés una cuenta?</p>
                            <Link to="/registro-alumno" className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-white">
                                <GraduationCap size={18}/> Registrarme como alumno
                            </Link>
                            <p className="mt-1.5 text-xs text-slate-300">Tu institución deberá aprobar el registro.</p>
                        </div>
                        <div className="mt-3"><InstallPwaButton /></div>
                        {/* NOTA DE SEGURIDAD */}
                        <div className="mt-3 flex items-center justify-center gap-2 text-center">
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

            <footer className="relative z-10 w-full px-4 pb-3 text-center text-[11px] text-slate-500">
                © {new Date().getFullYear()} EduQuest · Acceso institucional seguro
            </footer>
        </div>
    );
}
