import { useContext, useState, useCallback } from 'react';
import { useUnreadNotifications } from '../hooks/useNotifications';

import {
    Link,
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import {
    BookOpen,
    ClipboardList,
    Megaphone,
    LogOut,
    UserRound,
    ArrowLeft,
    LayoutDashboard,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    GraduationCap,
    ShieldCheck,
    PanelLeftClose,
    PanelLeftOpen,
    Sparkles,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import WebPushSettings from '../components/WebPushSettings';
import InstallPwaButton from '../components/InstallPwaButton';
import { revokePushOnLogout } from '../services/webPush';
import BackgroundLayout from './BackgroundLayout';
import logo from '../assets/images/logo2.png';

function getRoles(user) {
    if (!Array.isArray(user?.roles)) return [];

    return user.roles
        .map((role) => {
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

const NAVIGATION = [
    {
        to: '/dashboard',
        label: 'Panel principal',
        Icon: LayoutDashboard,
        end: true,
    },
    {
        to: '/dashboard/my-subjects',
        label: 'Mis cursos',
        Icon: BookOpen,
        teacherOnly: true,
    },
    {
        to: '/dashboard/early-notices',
        label: 'Avisos Tempranos',
        Icon: ClipboardList,
    },
    {
        to: '/dashboard/institution-communications',
        label: 'Comunicaciones',
        Icon: Megaphone,
    },
    {
        to: '/dashboard/profile',
        label: 'Mi perfil',
        Icon: UserRound,
    },
];

function getInitials(user) {
    const first = user?.firstName?.trim()?.charAt(0) || '';
    const last = user?.lastName?.trim()?.charAt(0) || '';

    return `${first}${last}`.toUpperCase() || 'U';
}

function SidebarLink({
    to,
    label,
    Icon,
    end = false,
    collapsed = false,
    onNavigate,
    unreadCount = 0,
}) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
                `group relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ${isActive
                    ? 'border-blue-500/25 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-950/10'
                    : 'border-transparent text-slate-400 hover:border-slate-700/70 hover:bg-slate-800/70 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-blue-400" />
                    )}

                    <Icon
                        size={19}
                        strokeWidth={isActive ? 2.3 : 1.9}
                        className={`shrink-0 ${isActive
                                ? 'text-blue-400'
                                : 'text-slate-400 group-hover:text-blue-300'
                            }`}
                    />

                    {collapsed && unreadCount > 0 && (
                        <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}

                    {!collapsed && (
                        <>
                            <span className="min-w-0 flex-1 truncate">
                                {label}
                            </span>

                            {unreadCount > 0 && (
                                <span aria-label={`${unreadCount} notificaciones sin leer`} className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-bold text-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}

                            {isActive && (
                                <ChevronRight
                                    size={15}
                                    className="text-blue-400"
                                />
                            )}
                        </>
                    )}
                </>
            )}
        </NavLink>
    );
}

function UserAvatar({ user, size = 'normal' }) {
    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-600/30 to-cyan-500/10 font-bold text-blue-200 ${size === 'large'
                    ? 'h-12 w-12 text-base'
                    : 'h-10 w-10 text-sm'
                }`}
        >
            {getInitials(user)}
        </div>
    );
}

export default function DashboardLayout() {
    const { user, token, logoutContext } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const unreadCount = useUnreadNotifications(Boolean(user));

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [dashboardHeader, setDashboardHeader] = useState(null);
    const updateDashboardHeader = useCallback(value => setDashboardHeader(value), []);

    const isRoot =
        location.pathname === '/dashboard' ||
        location.pathname === '/dashboard/';

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

    const visibleNavigation = NAVIGATION.filter(
        (item) => !item.teacherOnly || isTeacher
    );

    const currentPage =
        [...visibleNavigation]
            .sort((a, b) => b.to.length - a.to.length)
            .find((item) =>
                item.end
                    ? isRoot
                    : location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`)
            )?.label ||
        (isRoot ? 'Panel principal' : 'Gestión académica');

    const todayLabel = new Intl.DateTimeFormat('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date());
    const routeNames = {
        directors: 'Directivos', preceptors: 'Preceptores', teachers: 'Docentes',
        students: 'Alumnos', invitations: 'Invitaciones', careers: 'Carreras',
        courses: 'Cursos', subjects: 'Materias', institution: 'Institución',
        'subject-schedules': 'Horarios de materias', 'my-subjects': 'Mis cursos',
        'early-notices': 'Avisos tempranos',
        'institution-communications': 'Comunicaciones institucionales',
        profile: 'Mi perfil',
    };
    const routePart = location.pathname.split('/')[2];
    const assignmentRouteTitles = {
        students: 'Matrículas de alumnos', teachers: 'Asignación de docentes', schedules: 'Horarios y turnos',
    };
    const headerTitle = isRoot
        ? (dashboardHeader?.title || `¡Hola, ${user?.firstName || 'Usuario'}!`)
        : (location.pathname.startsWith('/dashboard/students/requests')
            ? 'Solicitudes de inscripción'
            : routePart === 'assignments'
                ? (assignmentRouteTitles[location.pathname.split('/')[3]] || 'Asignaciones')
                : routeNames[routePart] || currentPage);
    const headerEyebrow = isRoot
        ? (dashboardHeader?.eyebrow || todayLabel)
        : (['students', 'teachers', 'preceptors', 'directors', 'invitations'].includes(routePart)
            ? 'Gestión de usuarios'
            : ['careers', 'courses', 'subjects', 'subject-schedules', 'institution', 'assignments'].includes(routePart)
                ? 'Gestión académica' : 'EduQuest');

    // Respeta el historial del usuario. Si llegó por enlace directo, utiliza un destino seguro.
    const previousView = () => {
        if (location.pathname.startsWith('/dashboard/students/requests')) navigate('/dashboard/students');
        else if (location.pathname.startsWith('/dashboard/assignments/')) navigate('/dashboard', { state: { section: 'academic' } });
        else if (location.pathname.startsWith('/dashboard/my-subjects/')) navigate('/dashboard/my-subjects');
        else if (/^\/dashboard\/(students|teachers|preceptors|directors|invitations|careers|courses|subjects)(\/.*)?$/.test(location.pathname)) {
            navigate('/dashboard', { state: { section: /students|teachers|preceptors|directors|invitations/.test(location.pathname) ? 'users' : 'academic' } });
        } else {
            const idx = window.history.state?.idx;
            if (typeof idx === 'number' && idx > 0) navigate(-1);
            else navigate('/dashboard');
        }
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        setMobileMenuOpen(false);
        setProfileMenuOpen(false);
        try { await revokePushOnLogout(token); }
        catch (error) { console.warn('[EduQuest] No se pudo desvincular Push de este dispositivo:', error); }
        logoutContext();
    };

    const sidebarWidth = sidebarCollapsed
        ? 'lg:w-[88px]'
        : 'lg:w-[260px]';

    return (
        <BackgroundLayout>
            <div className="relative min-h-screen text-white">

                {/* CAPA OSCURA GENERAL */}
                <div className="pointer-events-none fixed inset-0 z-0 bg-slate-950/35" />

                {/* HEADER SUPERIOR */}
                <header className="sticky top-0 z-40 h-[76px] border-b border-slate-700/60 bg-slate-950/90 shadow-lg shadow-black/10 backdrop-blur-xl">
                    <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

                        {/* IZQUIERDA */}
                        <div className="flex min-w-0 items-center gap-3">

                            {/* MENÚ MÓVIL */}
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Abrir menú de navegación"
                                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white lg:hidden"
                            >
                                <Menu size={21} />
                            </button>

                            {/* LOGO */}
                            <Link
                                to="/dashboard"
                                onClick={closeMobileMenu}
                                className="hidden shrink-0 cursor-pointer items-center gap-3 sm:flex"
                                aria-label="Ir al panel principal"
                            >
                                <img
                                    src={logo}
                                    alt="EduQuest"
                                    className="h-11 w-auto max-w-[110px] object-contain sm:h-12"
                                />
                            </Link>

                            <div className="hidden h-8 w-px bg-slate-700/80 sm:block" />

                            <div className="min-w-0">
                                <p className="max-w-[200px] truncate text-[9px] font-semibold uppercase tracking-[0.09em] text-sky-400 sm:max-w-[400px] sm:text-[10px] sm:tracking-[0.14em]">
                                    {headerEyebrow}
                                </p>
                                <h1 className="mt-0.5 max-w-[165px] truncate text-xs font-bold text-white sm:max-w-[420px] sm:text-base" title={headerTitle}>
                                    {headerTitle}
                                </h1>
                            </div>
                        </div>

                        {/* DERECHA */}
                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <InstallPwaButton compact />
                            <WebPushSettings compact />
                            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300 xl:flex">
                                <ShieldCheck size={14} />
                                Sesión activa
                            </div>

                            {/* PERFIL DESPLEGABLE */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setProfileMenuOpen((prev) => !prev)
                                    }
                                    aria-expanded={profileMenuOpen}
                                    aria-label="Opciones de usuario"
                                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-slate-700 hover:bg-slate-800/70"
                                >
                                    <UserAvatar user={user} />

                                    <div className="hidden min-w-0 text-left md:block">
                                        <p className="max-w-[170px] truncate text-sm font-semibold text-white">
                                            {fullName}
                                        </p>

                                        <p className="max-w-[170px] truncate text-xs text-slate-400">
                                            {displayRoles.length
                                                ? ROLE_LABELS[displayRoles[0]] ||
                                                displayRoles[0]
                                                : 'Usuario'}
                                        </p>
                                    </div>

                                    <ChevronDown
                                        size={16}
                                        className={`hidden text-slate-400 transition-transform md:block ${profileMenuOpen
                                                ? 'rotate-180'
                                                : ''
                                            }`}
                                    />
                                </button>

                                {profileMenuOpen && (
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Cerrar menú de usuario"
                                            onClick={() =>
                                                setProfileMenuOpen(false)
                                            }
                                            className="fixed inset-0 z-40 cursor-default"
                                        />

                                        <div className="absolute right-0 top-full z-50 mt-3 w-[280px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">

                                            <div className="border-b border-slate-800 p-4">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        user={user}
                                                        size="large"
                                                    />

                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-white">
                                                            {fullName}
                                                        </p>

                                                        <p className="mt-1 truncate text-xs text-slate-400">
                                                            {user?.email || 'Cuenta EduQuest'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                    {displayRoles.map((role) => (
                                                        <span
                                                            key={role}
                                                            className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-300"
                                                        >
                                                            {ROLE_LABELS[role] || role}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-2">
                                                <Link
                                                    to="/dashboard/profile"
                                                    onClick={() =>
                                                        setProfileMenuOpen(false)
                                                    }
                                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                                                >
                                                    <UserRound size={18} />
                                                    Mi perfil
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={handleLogout}
                                                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                                                >
                                                    <LogOut size={18} />
                                                    Cerrar sesión
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* CUERPO PRINCIPAL */}
                <div className="relative z-10 flex min-h-[calc(100vh-76px)]">

                    {/* SIDEBAR ESCRITORIO */}
                    <aside
                        className={`sticky top-[76px] hidden h-[calc(100vh-76px)] shrink-0 flex-col border-r border-slate-700/60 bg-slate-950/85 backdrop-blur-xl transition-[width] duration-300 lg:flex ${sidebarWidth}`}
                    >
                        <div className="flex min-h-0 flex-1 flex-col p-3">

                            {/* ENCABEZADO SIDEBAR */}
                            <div
                                className={`mb-5 flex items-center ${sidebarCollapsed
                                        ? 'justify-center'
                                        : 'justify-between px-2'
                                    }`}
                            >
                                {!sidebarCollapsed && (
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Navegación
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSidebarCollapsed((prev) => !prev)
                                    }
                                    title={
                                        sidebarCollapsed
                                            ? 'Expandir menú'
                                            : 'Contraer menú'
                                    }
                                    aria-label={
                                        sidebarCollapsed
                                            ? 'Expandir menú'
                                            : 'Contraer menú'
                                    }
                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                                >
                                    {sidebarCollapsed ? (
                                        <PanelLeftOpen size={19} />
                                    ) : (
                                        <PanelLeftClose size={19} />
                                    )}
                                </button>
                            </div>

                            {/* ENLACES */}
                            <nav
                                aria-label="Navegación principal"
                                className="space-y-1.5"
                            >
                                {visibleNavigation.map((item) => (
                                    <SidebarLink
                                        key={item.to}
                                        {...item}
                                        unreadCount={item.to === '/dashboard/early-notices' ? unreadCount : 0}
                                        collapsed={sidebarCollapsed}
                                    />
                                ))}
                            </nav>

                            <div className="mt-auto pt-6">

                                {!sidebarCollapsed && (
                                    <div className="mb-4 rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-slate-900/30 p-4">
                                        <Sparkles
                                            size={19}
                                            className="mb-3 text-blue-400"
                                        />

                                        <p className="text-sm font-semibold text-slate-200">
                                            Seguí avanzando
                                        </p>

                                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                            Cada desafío es una oportunidad para aprender.
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title={
                                        sidebarCollapsed
                                            ? 'Cerrar sesión'
                                            : undefined
                                    }
                                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-rose-500/10 px-3 py-3 text-sm font-medium text-rose-400 transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 ${sidebarCollapsed
                                            ? 'justify-center'
                                            : ''
                                        }`}
                                >
                                    <LogOut size={19} />

                                    {!sidebarCollapsed && (
                                        <span>Cerrar sesión</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* CONTENIDO */}
                    <div className="min-w-0 flex-1">

                        {/* BARRA DE UBICACIÓN */}
                        {!isRoot && (
                            <div className="border-b border-slate-700/40 bg-slate-950/30 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
                                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                    <button type="button" onClick={previousView}
                                        className="mr-3 inline-flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                        aria-label="Volver a la vista anterior">
                                        <ArrowLeft size={20} strokeWidth={3} /> Volver atrás
                                    </button>
                                    <Link
                                        to="/dashboard"
                                        className="inline-flex cursor-pointer items-center gap-2 text-slate-400 transition-colors hover:text-blue-300"
                                    >
                                        <LayoutDashboard size={15} />
                                        Panel principal
                                    </Link>

                                    <ChevronRight
                                        size={14}
                                        className="text-slate-600"
                                    />

                                    <span className="font-medium text-slate-200">
                                        {currentPage}
                                    </span>
                                </div>
                            </div>
                        )}

                        <main className="mx-auto w-full max-w-[1700px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                            <Outlet context={{ updateDashboardHeader }} />
                        </main>
                    </div>
                </div>

                {/* OVERLAY MÓVIL */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">

                        <button
                            type="button"
                            onClick={closeMobileMenu}
                            aria-label="Cerrar navegación"
                            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
                        />

                        <aside className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col border-r border-slate-700 bg-slate-950 shadow-2xl">

                            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
                                <img
                                    src={logo}
                                    alt="EduQuest"
                                    className="h-12 w-auto object-contain"
                                />

                                <button
                                    type="button"
                                    onClick={closeMobileMenu}
                                    aria-label="Cerrar menú"
                                    className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                                >
                                    <X size={21} />
                                </button>
                            </div>

                            <div className="border-b border-slate-800 p-5">
                                <div className="flex items-center gap-3">
                                    <UserAvatar user={user} />

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {fullName}
                                        </p>

                                        <p className="truncate text-xs text-slate-400">
                                            {user?.email || 'Usuario EduQuest'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                <p className="mb-4 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Navegación
                                </p>

                                <nav className="space-y-1.5">
                                    {visibleNavigation.map((item) => (
                                        <SidebarLink
                                            key={item.to}
                                            {...item}
                                            unreadCount={item.to === '/dashboard/early-notices' ? unreadCount : 0}
                                            onNavigate={closeMobileMenu}
                                        />
                                    ))}
                                </nav>
                            </div>

                            <div className="border-t border-slate-800 p-4">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10"
                                >
                                    <LogOut size={18} />
                                    Cerrar sesión
                                </button>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </BackgroundLayout>
    );
}
