
import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BookOpen,
    ClipboardList,
    GraduationCap,
    Users,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboard';
import { hasAny } from '../config/permissions';

import EarlyNoticesView from './EarlyNoticesView';

const SECTIONS = {
    notices: {
        label: 'Avisos Tempranos',
        description:
            'Consultá ausencias, llegadas tarde y avisos de docentes.',
        color: 'text-amber-400',
        border: 'hover:border-amber-500/50',
        Icon: ClipboardList,
        items: [
            {
                key: 'earlyNotices',
                label: 'Ver Avisos Tempranos',
                color: 'text-amber-400',
                path: '/dashboard/early-notices',
                publicToAuthenticated: true,
                hideCount: true,
            },
        ],
    },

    users: {
        label: 'Gestión de usuarios',
        description:
            'Administrá usuarios, roles e inscripciones dentro de la institución.',
        color: 'text-blue-400',
        border: 'hover:border-blue-500/50',
        Icon: Users,
        items: [
            {
                key: 'directors',
                label: 'Directivos',
                color: 'text-amber-400',
                path: '/dashboard/directors',
                action: 'director:manage',
            },
            {
                key: 'preceptors',
                label: 'Preceptores',
                color: 'text-purple-400',
                path: '/dashboard/preceptors',
                action: 'preceptor:manage',
            },
            {
                key: 'teachers',
                label: 'Docentes',
                color: 'text-emerald-400',
                path: '/dashboard/teachers',
                action: 'teacher:manage',
            },
            {
                key: 'students',
                label: 'Alumnos',
                color: 'text-blue-400',
                path: '/dashboard/students',
                action: 'student:view',
            },
            {
                key: 'invitations',
                label: 'Invitaciones Activas',
                color: 'text-pink-400',
                path: '/dashboard/invitations',
                action: 'invitation:manage',
            },
        ],
    },

    academic: {
        label: 'Gestión académica',
        description:
            'Configurá instituciones, carreras, cursos, materias y sus asignaciones.',
        color: 'text-cyan-400',
        border: 'hover:border-cyan-500/50',
        Icon: GraduationCap,
        items: [
            {
                key: 'institutions',
                label: 'Institución',
                color: 'text-orange-400',
                path: '/dashboard/institution',
                action: 'institution:manage',
            },
            {
                key: 'careers',
                label: 'Carreras / Niveles',
                color: 'text-cyan-400',
                path: '/dashboard/careers',
                action: 'career:manage',
            },
            {
                key: 'courses',
                label: 'Cursos',
                color: 'text-teal-400',
                path: '/dashboard/courses',
                action: 'course:manage',
            },
            {
                key: 'subjects',
                label: 'Materias',
                color: 'text-lime-400',
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
        .map(role => {
            if (typeof role === 'string') {
                return role.trim().toUpperCase();
            }

            return String(
                role?.name || role?.role || ''
            ).trim().toUpperCase();
        })
        .filter(Boolean);
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

    const isStudentOnly =
        !isSuperAdmin &&
        roles.length === 1 &&
        roles.includes('STUDENT');

    const token = auth.token ?? auth.accessToken;

    // Una sección administrativa solo puede mostrarse
    // a usuarios con roles administrativos reconocidos.
    // Dentro de ella se verifican además los permisos
    // correspondientes a cada opción.
    const getVisibleItems = section => {
        const isAdministrativeSection =
            section === SECTIONS.users ||
            section === SECTIONS.academic;

        if (isAdministrativeSection && !isAdministrator) {
            return [];
        }

        return section.items.filter(item => {
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

    // Si un usuario deja de tener autorización para
    // una sección mientras está abierta, se evita
    // renderizar sus opciones.
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

    // Los alumnos que únicamente tienen el rol STUDENT
    // siguen ingresando directamente a Avisos Tempranos.
    if (isStudentOnly) {
        return (
            <EarlyNoticesView
                token={token}
                currentUser={user}
            />
        );
    }

    if (!canShowCurrentSection) {
        return (
            <div className="space-y-7">
                <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                        ¡Hola de nuevo, {user?.firstName || 'Usuario'}!
                    </h1>

                    <p className="mt-2 text-sm text-slate-300">
                        Seleccioná una opción para continuar.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {/* Acceso directo para docentes */}
                    {isTeacher && (
                        <Link
                            to="/dashboard/my-subjects"
                            className="group flex min-h-48 cursor-pointer flex-col justify-between rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-6 shadow-lg transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-slate-800"
                        >
                            <div className="flex items-start justify-between">
                                <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
                                    <BookOpen size={28} />
                                </div>

                                <ArrowRight
                                    size={21}
                                    className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400"
                                />
                            </div>

                            <div className="mt-5">
                                <h2 className="text-xl font-bold text-emerald-400">
                                    Mis materias
                                </h2>

                                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                    Accedé a tus materias asignadas,
                                    contenidos y actividades.
                                </p>

                                <span className="mt-4 inline-block text-xs font-semibold text-emerald-300">
                                    Ingresar a mis materias →
                                </span>
                            </div>
                        </Link>
                    )}

                    {/* Solo se renderizan secciones autorizadas */}
                    {visibleSections.map(([key, section]) => {
                        const Icon = section.Icon;

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveSection(key)}
                                className={`group flex min-h-48 cursor-pointer flex-col justify-between rounded-2xl border border-slate-700 bg-slate-900/95 p-6 text-left shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800 ${section.border}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`rounded-xl bg-slate-800 p-3 ${section.color}`}>
                                        <Icon size={27} />
                                    </div>

                                    <ArrowRight
                                        size={21}
                                        className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white"
                                    />
                                </div>

                                <div className="mt-5">
                                    <h2 className={`text-xl font-bold ${section.color}`}>
                                        {section.label}
                                    </h2>

                                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                        {section.description}
                                    </p>

                                    <span className="mt-4 inline-block text-xs font-semibold text-slate-400 transition-colors group-hover:text-white">
                                        Ingresar →
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    const section = currentSection;
    const visibleItems = currentVisibleItems;

    return (
        <div>
            <div className="mb-8">
                <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="mb-4 cursor-pointer text-sm text-white transition-colors hover:text-slate-300 md:text-base"
                >
                    ← Volver al panel principal
                </button>

                <h1 className={`text-2xl font-bold ${section.color}`}>
                    {section.label}
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                    {section.description}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4">
                {visibleItems.map(item => (
                    <Link
                        key={item.key}
                        to={item.path}
                        className="group cursor-pointer rounded-xl border border-slate-700 bg-slate-900 p-6 transition-colors hover:border-slate-500 hover:bg-slate-800"
                    >
                        <h3 className={`text-lg font-semibold ${item.color}`}>
                            {item.label}
                        </h3>

                        {!item.hideCount && (
                            <p className="mt-3 text-3xl font-extrabold text-white">
                                {isLoading
                                    ? '...'
                                    : isError
                                        ? '—'
                                        : summary?.[item.key] ?? 0}
                            </p>
                        )}

                        <span className="mt-4 inline-block text-xs text-slate-400 group-hover:text-white">
                            {item.hideCount
                                ? 'Ver avisos →'
                                : 'Ver y administrar →'}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
