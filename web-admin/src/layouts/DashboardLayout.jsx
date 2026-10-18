
import { useContext } from 'react';

import {
    Link,
    NavLink,
    Outlet,
    useLocation,
} from 'react-router-dom';

import {
    BookOpen,
    ClipboardList,
    LogOut,
    UserRound,
    ArrowLeft,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import BackgroundLayout from './BackgroundLayout';
import logo from '../assets/images/logo2.png';

function getRoles(user) {
    if (!Array.isArray(user?.roles)) {
        return [];
    }

    return user.roles
        .map(role => {
            if (typeof role === 'string') {
                return role.toUpperCase();
            }

            return String(
                role?.name || role?.role || ''
            ).toUpperCase();
        })
        .filter(Boolean);
}

const ROLE_LABELS = {
    SUPER_ADMIN: 'Superadministrador',
    DIRECTOR: 'Directivo',
    PRECEPTOR: 'Preceptor',
    TEACHER: 'Docente',
    STUDENT: 'Alumno',
};

function NavigationButton({ to, Icon, children }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${isActive
                    ? 'border-blue-400 bg-blue-600 text-white shadow-md shadow-blue-950/20'
                    : 'border-slate-600 bg-slate-800/80 text-slate-200 hover:border-blue-400 hover:bg-slate-700 hover:text-white'
                }`
            }
        >
            <Icon size={17} strokeWidth={2} />
            {children}
        </NavLink>
    );
}

export default function DashboardLayout() {
    const { user, logoutContext } = useContext(AuthContext);
    const location = useLocation();

    const isRoot = location.pathname === '/dashboard';

    const roles = getRoles(user);

    const isTeacher =
        roles.includes('TEACHER') ||
        Boolean(user?.teacherProfile);

    const displayRoles = [...roles];

    if (
        user?.isSuperAdmin &&
        !displayRoles.includes('SUPER_ADMIN')
    ) {
        displayRoles.unshift('SUPER_ADMIN');
    }

    const fullName =
        [user?.firstName, user?.lastName]
            .filter(Boolean)
            .join(' ') || 'Usuario';

    return (
        <BackgroundLayout>
            <div className="min-h-screen text-white">
                <header className="border-b border-slate-600/60 bg-slate-800/95 shadow-lg shadow-slate-950/10">
                    <div className="px-4 py-4 md:px-8 md:py-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                                <Link
                                    to="/dashboard"
                                    className="shrink-0 cursor-pointer"
                                    aria-label="Ir al panel principal"
                                >
                                    <img
                                        src={logo}
                                        alt="EduQuest"
                                        className="h-12 w-auto object-contain md:h-16"
                                    />
                                </Link>

                                <div className="min-w-0">
                                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                                        Panel administrativo
                                    </p>

                                    <h1 className="truncate text-lg font-bold tracking-tight text-white md:text-xl">
                                        {fullName}
                                    </h1>

                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {displayRoles.map(role => (
                                            <span
                                                key={role}
                                                className="rounded-md border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300"
                                            >
                                                {ROLE_LABELS[role] || role}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <nav
                                aria-label="Navegación del usuario"
                                className="flex flex-wrap items-center gap-2"
                            >
                                {isTeacher && (
                                    <NavigationButton
                                        to="/dashboard/my-subjects"
                                        Icon={BookOpen}
                                    >
                                        Mis materias
                                    </NavigationButton>
                                )}

                                <NavigationButton
                                    to="/dashboard/early-notices"
                                    Icon={ClipboardList}
                                >
                                    Avisos Tempranos
                                </NavigationButton>

                                <NavigationButton
                                    to="/dashboard/profile"
                                    Icon={UserRound}
                                >
                                    Mi perfil
                                </NavigationButton>

                                <button
                                    type="button"
                                    onClick={logoutContext}
                                    className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-all hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200"
                                >
                                    <LogOut size={17} />
                                    Cerrar sesión
                                </button>
                            </nav>
                        </div>

                        {!isRoot && (
                            <div className="mt-5 border-t border-slate-700 pt-4">
                                <Link
                                    to="/dashboard"
                                    className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                                >
                                    <ArrowLeft size={16} />
                                    Volver al panel principal
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

                <main className="p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </BackgroundLayout>
    );
}
