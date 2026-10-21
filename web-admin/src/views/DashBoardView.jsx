
import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';

import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    ClipboardList,
    GraduationCap,
    Users,
    Building2,
    School,
    Layers3,
    LibraryBig,
    UserCog,
    UserRoundCheck,
    Presentation,
    UsersRound,
    Mail,
    ChevronLeft,
    LayoutDashboard,
    CalendarDays,
    Megaphone,
    ShieldCheck,
    LoaderCircle,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboard';
import { hasAny } from '../config/permissions';


const SECTIONS = {
    notices: {
        label: 'Avisos Tempranos',
        eyebrow: 'Comunicación institucional',
        description:
            'Consultá ausencias, llegadas tarde y avisos de docentes.',
        color: 'text-amber-400',
        iconBackground: 'bg-amber-500/10',
        iconBorder: 'border-amber-500/20',
        hoverBorder: 'hover:border-amber-500/40',
        gradient: 'from-amber-500/10 via-transparent to-transparent',
        Icon: ClipboardList,
        directPath: '/dashboard/early-notices',
        items: [
            {
                key: 'earlyNotices',
                label: 'Ver Avisos Tempranos',
                description:
                    'Consultá los avisos registrados y su estado.',
                color: 'text-amber-400',
                iconBackground: 'bg-amber-500/10',
                Icon: CalendarDays,
                path: '/dashboard/early-notices',
                publicToAuthenticated: true,
                hideCount: true,
            },
        ],
    },


    communications: {
        label: 'Avisos Institucionales',
        eyebrow: 'Comunicación institucional',
        description: 'Consultá eventos, suspensiones de actividades y comunicados de tu institución.',
        color: 'text-sky-400',
        iconBackground: 'bg-sky-500/10',
        iconBorder: 'border-sky-500/20',
        hoverBorder: 'hover:border-sky-500/40',
        gradient: 'from-sky-500/10 via-transparent to-transparent',
        Icon: Megaphone,
        directPath: '/dashboard/institution-communications',
        items: [{
            key: 'institutionCommunications',
            label: 'Ver Avisos Institucionales',
            description: 'Eventos y suspensiones de actividades.',
            color: 'text-sky-400',
            iconBackground: 'bg-sky-500/10',
            Icon: Megaphone,
            path: '/dashboard/institution-communications',
            publicToAuthenticated: true,
            hideCount: true,
        }],
    },

    users: {
        label: 'Gestión de usuarios',
        eyebrow: 'Administración de personas',
        description:
            'Administrá usuarios, roles e inscripciones dentro de la institución.',
        color: 'text-blue-400',
        iconBackground: 'bg-blue-500/10',
        iconBorder: 'border-blue-500/20',
        hoverBorder: 'hover:border-blue-500/40',
        gradient: 'from-blue-500/10 via-transparent to-transparent',
        Icon: Users,
        items: [
            {
                key: 'directors',
                label: 'Directivos',
                description: 'Gestión del equipo directivo.',
                color: 'text-amber-400',
                iconBackground: 'bg-amber-500/10',
                Icon: UserCog,
                path: '/dashboard/directors',
                action: 'director:manage',
            },
            {
                key: 'preceptors',
                label: 'Preceptores',
                description: 'Administración de preceptores.',
                color: 'text-purple-400',
                iconBackground: 'bg-purple-500/10',
                Icon: UserRoundCheck,
                path: '/dashboard/preceptors',
                action: 'preceptor:manage',
            },
            {
                key: 'teachers',
                label: 'Docentes',
                description: 'Administración del plantel docente.',
                color: 'text-emerald-400',
                iconBackground: 'bg-emerald-500/10',
                Icon: Presentation,
                path: '/dashboard/teachers',
                action: 'teacher:manage',
            },
            {
                key: 'students',
                label: 'Alumnos',
                description: 'Consulta y gestión de estudiantes.',
                color: 'text-blue-400',
                iconBackground: 'bg-blue-500/10',
                Icon: UsersRound,
                path: '/dashboard/students',
                action: 'student:view',
            },
            {
                key: 'invitations',
                label: 'Invitaciones Activas',
                description: 'Administrá las invitaciones de acceso.',
                color: 'text-pink-400',
                iconBackground: 'bg-pink-500/10',
                Icon: Mail,
                path: '/dashboard/invitations',
                action: 'invitation:manage',
            },
        ],
    },

    academic: {
        label: 'Gestión académica',
        eyebrow: 'Estructura educativa',
        description:
            'Configurá instituciones, carreras, cursos, materias y sus asignaciones.',
        color: 'text-cyan-400',
        iconBackground: 'bg-cyan-500/10',
        iconBorder: 'border-cyan-500/20',
        hoverBorder: 'hover:border-cyan-500/40',
        gradient: 'from-cyan-500/10 via-transparent to-transparent',
        Icon: GraduationCap,
        items: [
            {
                key: 'institutions',
                label: 'Institución',
                description: 'Datos y configuración institucional.',
                color: 'text-orange-400',
                iconBackground: 'bg-orange-500/10',
                Icon: Building2,
                path: '/dashboard/institution',
                action: 'institution:manage',
            },
            {
                key: 'careers',
                label: 'Carreras / Niveles',
                description: 'Organización de carreras y niveles.',
                color: 'text-cyan-400',
                iconBackground: 'bg-cyan-500/10',
                Icon: School,
                path: '/dashboard/careers',
                action: 'career:manage',
            },
            {
                key: 'courses',
                label: 'Cursos',
                description: 'Gestión de cursos y divisiones.',
                color: 'text-teal-400',
                iconBackground: 'bg-teal-500/10',
                Icon: Layers3,
                path: '/dashboard/courses',
                action: 'course:manage',
            },
            {
                key: 'subjects',
                label: 'Materias',
                description: 'Materias y organización curricular.',
                color: 'text-lime-400',
                iconBackground: 'bg-lime-500/10',
                Icon: LibraryBig,
                path: '/dashboard/subjects',
                action: 'subject:manage',
            },
        ],
    },
};

function getRoles(user) {
    if (!Array.isArray(user?.roles)) {
        return [];
    }

    return user.roles
        .map((role) => {
            if (typeof role === 'string') {
                return role.trim().toUpperCase();
            }

            return String(
                role?.name || role?.role || ''
            ).trim().toUpperCase();
        })
        .filter(Boolean);
}

function ModuleCard({
    section,
    onClick,
    count,
}) {
    const Icon = section.Icon;

    const content = (
        <>
            <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-70 transition-opacity duration-300 group-hover:opacity-100`}
            />

            <div className="relative flex w-full items-start justify-between gap-3">
                <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${section.iconBorder} ${section.iconBackground} ${section.color}`}
                >
                    <Icon size={27} strokeWidth={1.8} />
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800/70 text-slate-400 transition-all group-hover:border-slate-600 group-hover:bg-slate-700 group-hover:text-white">
                    <ArrowUpRight size={18} />
                </div>
            </div>

            <div className="relative mt-auto pt-7">
                <p
                    className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${section.color}`}
                >
                    {section.eyebrow}
                </p>

                <h3 className="text-xl font-bold tracking-tight text-white">
                    {section.label}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
                    {section.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-slate-700/60 pt-4">
                    <span className="text-xs font-semibold text-slate-300 transition-colors group-hover:text-white">
                        {section.directPath
                            ? 'Abrir módulo'
                            : 'Explorar módulo'}
                    </span>

                    <span className="flex items-center gap-2 text-xs text-slate-500">
                        {!section.directPath && (
                            <>
                                {count}{' '}
                                {count === 1 ? 'opción' : 'opciones'}
                            </>
                        )}

                        <ArrowRight
                            size={15}
                            className="transition-transform group-hover:translate-x-1"
                        />
                    </span>
                </div>
            </div>
        </>
    );

    const className = `group relative flex min-h-[245px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/90 p-6 text-left shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-xl hover:shadow-black/20 ${section.hoverBorder}`;

    // Avisos Tempranos navega directamente a su vista.
    if (section.directPath) {
        return (
            <Link
                to={section.directPath}
                className={className}
            >
                {content}
            </Link>
        );
    }

    // Los módulos administrativos conservan sus submenús.
    return (
        <button
            type="button"
            onClick={onClick}
            className={className}
        >
            {content}
        </button>
    );
}

function AccessCard({
    item,
    summary,
    isLoading,
    isError,
}) {
    const Icon = item.Icon;

    const value = isLoading
        ? null
        : isError
            ? '—'
            : summary?.[item.key] ?? 0;

    return (
        <Link
            to={item.path}
            className="group relative flex min-h-[215px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-md shadow-black/10 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:bg-slate-800/95 hover:shadow-xl hover:shadow-black/20 sm:p-6"
        >
            <div className="flex items-start justify-between gap-3">
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBackground} ${item.color}`}
                >
                    <Icon size={24} strokeWidth={1.9} />
                </div>

                <ArrowUpRight
                    size={20}
                    className="text-slate-500 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                />
            </div>

            <div className="mt-5">
                <h3 className="text-base font-bold text-white sm:text-lg">
                    {item.label}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {item.description}
                </p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                {!item.hideCount ? (
                    <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Registros
                        </p>

                        {isLoading ? (
                            <LoaderCircle
                                size={23}
                                className="animate-spin text-blue-400"
                            />
                        ) : (
                            <p className="text-3xl font-bold tracking-tight text-white">
                                {typeof value === 'number'
                                    ? value.toLocaleString('es-AR')
                                    : value}
                            </p>
                        )}
                    </div>
                ) : (
                    <span className="text-xs font-semibold text-slate-300">
                        Consultar avisos
                    </span>
                )}

                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition-colors group-hover:border-blue-500/30 group-hover:bg-blue-500/10 group-hover:text-blue-400">
                    <ArrowRight size={17} />
                </span>
            </div>
        </Link>
    );
}

export default function DashboardView() {
    const auth = useContext(AuthContext);
    const { user } = auth;

    const [activeSection, setActiveSection] = useState(null);

    const {
        data: summary,
        isLoading,
        isError,
    } = useDashboardSummary();

    const roles = getRoles(user);

    const isSuperAdmin =
        user?.isSuperAdmin === true ||
        roles.includes('SUPER_ADMIN');

    const isDirector = roles.includes('DIRECTOR');
    const isPreceptor = roles.includes('PRECEPTOR');

    const isAdministrator =
        isSuperAdmin ||
        isDirector ||
        isPreceptor;

    const isTeacher =
        roles.includes('TEACHER') ||
        Boolean(user?.teacherProfile);


    const getVisibleItems = (section) => {
        const isAdministrativeSection =
            section === SECTIONS.users ||
            section === SECTIONS.academic;

        if (isAdministrativeSection && !isAdministrator) {
            return [];
        }

        return section.items.filter((item) => {
            if (item.publicToAuthenticated) {
                return Boolean(user);
            }

            if (isSuperAdmin) {
                return true;
            }

            return hasAny(roles, item.action);
        });
    };

    const visibleSections = Object.entries(SECTIONS)
        .filter(([, section]) =>
            getVisibleItems(section).length > 0
        );

    const currentSection =
        activeSection && SECTIONS[activeSection]
            ? SECTIONS[activeSection]
            : null;

    const currentVisibleItems = currentSection
        ? getVisibleItems(currentSection)
        : [];

    const canShowCurrentSection =
        currentSection &&
        currentVisibleItems.length > 0;

    const firstName =
        user?.firstName?.trim() || 'Usuario';

    const today = new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    const formattedDate =
        today.charAt(0).toUpperCase() + today.slice(1);

    // Los estudiantes ven las dos tarjetas de comunicaciones en el panel principal.
    // Ya no se los redirige automáticamente a Avisos Tempranos.

    // PANTALLA PRINCIPAL
    if (!canShowCurrentSection) {
        return (
            <div className="mx-auto w-full max-w-7xl space-y-7 pb-8">

                {/* BIENVENIDA COMPACTA */}
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/75 px-5 py-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-blue-400">
                            Panel de control
                        </p>

                        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                            Bienvenido, {firstName}
                        </h1>

                        <p className="mt-1 text-sm text-slate-400">
                            Seleccioná un módulo para comenzar.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2.5 text-xs text-slate-300 sm:self-auto">
                        <CalendarDays
                            size={16}
                            className="text-blue-400"
                        />
                        {formattedDate}
                    </div>
                </div>

                {/* ENCABEZADO DE MÓDULOS */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                            Módulos disponibles
                        </h2>

                        <p className="mt-1.5 text-sm text-slate-400">
                            Accedé a las herramientas de EduQuest.
                        </p>
                    </div>

                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
                        <LayoutDashboard size={15} />
                        {visibleSections.length + (isTeacher ? 1 : 0)}{' '}
                        módulos
                    </span>
                </div>

                {/* TARJETAS PRINCIPALES */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

                    {isTeacher && (
                        <Link
                            to="/dashboard/my-subjects"
                            className="group relative flex min-h-[245px] flex-col overflow-hidden rounded-2xl border border-emerald-500/25 bg-slate-900/90 p-6 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-900 hover:shadow-xl"
                        >
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />

                            <div className="relative flex items-start justify-between">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                    <BookOpen size={27} />
                                </div>

                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800/70 text-slate-400 transition-colors group-hover:text-white">
                                    <ArrowUpRight size={18} />
                                </div>
                            </div>

                            <div className="relative mt-auto pt-7">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                                    Espacio docente
                                </p>

                                <h3 className="text-xl font-bold text-white">
                                    Mis materias
                                </h3>

                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    Accedé a tus materias asignadas,
                                    contenidos y actividades.
                                </p>

                                <div className="mt-6 flex items-center justify-between border-t border-slate-700/60 pt-4">
                                    <span className="text-xs font-semibold text-slate-300">
                                        Ingresar a mis materias
                                    </span>

                                    <ArrowRight
                                        size={17}
                                        className="text-emerald-400 transition-transform group-hover:translate-x-1"
                                    />
                                </div>
                            </div>
                        </Link>
                    )}

                    {visibleSections.map(([key, section]) => (
                        <ModuleCard
                            key={key}
                            section={section}
                            count={getVisibleItems(section).length}
                            onClick={() => setActiveSection(key)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // SUBMÓDULOS ADMINISTRATIVOS
    const section = currentSection;
    const visibleItems = currentVisibleItems;
    const SectionIcon = section.Icon;

    return (
        <div className="mx-auto w-full max-w-7xl space-y-7 pb-8">

            <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-blue-500/30 hover:bg-slate-800 hover:text-white"
            >
                <ChevronLeft size={18} />
                Volver a los módulos
            </button>

            {/* CABECERA COMPACTA */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-lg shadow-black/10 sm:p-6">
                <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${section.gradient}`}
                />

                <div className="relative flex items-center gap-4">
                    <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${section.iconBorder} ${section.iconBackground} ${section.color}`}
                    >
                        <SectionIcon
                            size={27}
                            strokeWidth={1.8}
                        />
                    </div>

                    <div>
                        <p
                            className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${section.color}`}
                        >
                            {section.eyebrow}
                        </p>

                        <h1 className="text-xl font-bold text-white sm:text-2xl">
                            {section.label}
                        </h1>

                        <p className="mt-1 text-sm text-slate-400">
                            {section.description}
                        </p>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">
                    Opciones disponibles
                </h2>

                <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400">
                    {visibleItems.length}{' '}
                    {visibleItems.length === 1
                        ? 'opción'
                        : 'opciones'}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((item) => (
                    <AccessCard
                        key={item.key}
                        item={item}
                        summary={summary}
                        isLoading={isLoading}
                        isError={isError}
                    />
                ))}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <ShieldCheck
                    size={19}
                    className="shrink-0 text-blue-400"
                />

                <p className="text-xs leading-relaxed text-slate-400">
                    Las opciones disponibles dependen de los permisos
                    asignados a tu usuario dentro de EduQuest.
                </p>
            </div>
        </div>
    );
}
