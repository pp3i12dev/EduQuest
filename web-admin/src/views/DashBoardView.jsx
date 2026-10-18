
import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboard';
import { hasAny } from '../config/permissions';

import EarlyNoticesView from './EarlyNoticesView';

const SECTIONS = {
    notices: {
        label: 'Avisos Tempranos',
        description:
            'Consultá ausencias, llegadas tarde y avisos de docentes.',
        color: 'text-yellow-400',
        border: 'hover:border-yellow-500/50',
        items: [
            {
                key: 'earlyNotices',
                label: 'Ver Avisos Tempranos',
                color: 'text-yellow-400',
                path: '/dashboard/early-notices',
                publicToAuthenticated: true,
                hideCount: true,
            },
        ],
    },

    users: {
        label: 'Gestión de usuarios',
        description:
            'Administra usuarios, roles e inscripciones dentro de la institución.',
        color: 'text-blue-400',
        border: 'hover:border-blue-500/50',
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
            'Configura instituciones, carreras, cursos, materias y sus asignaciones.',
        color: 'text-cyan-400',
        border: 'hover:border-cyan-500/50',
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
            {
                key: 'mySubjects',
                label: 'Mis materias',
                color: 'text-lime-400',
                path: '/dashboard/my-subjects',
                action: 'subjectContent:manage',
            },
        ],
    },
};

function getRoles(user) {
    if (!Array.isArray(user?.roles)) {
        return [];
    }

    return user.roles.map(role => {
        if (typeof role === 'string') {
            return role.toUpperCase();
        }

        return String(
            role?.name || role?.role || ''
        ).toUpperCase();
    });
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

    const isStudentOnly =
        !isSuperAdmin &&
        roles.length === 1 &&
        roles.includes('STUDENT');

    // Utilizamos el token expuesto por AuthContext.
    // El nombre exacto debe coincidir con su implementación.
    const token = auth.token ?? auth.accessToken;

    const getVisibleItems = section =>
        section.items.filter(item => {
            if (item.publicToAuthenticated) {
                return Boolean(user);
            }

            if (isSuperAdmin) {
                return true;
            }

            return hasAny(user?.roles, item.action);
        });

    const canAccessSection = section =>
        getVisibleItems(section).length > 0;

    // Los alumnos acceden directamente al listado.
    if (isStudentOnly) {
        return (
            <EarlyNoticesView
                token={token}
                currentUser={user}
            />
        );
    }

    if (!activeSection) {
        return (
            <div>
                <p className="mb-8 text-sm text-white lg:text-xl">
                    ¡Hola de nuevo, {user?.firstName || 'Usuario'}!
                </p>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {Object.entries(SECTIONS).map(
                        ([key, section]) => {
                            const accessible =
                                canAccessSection(section);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        if (accessible) {
                                            setActiveSection(key);
                                        }
                                    }}
                                    disabled={!accessible}
                                    className={`group rounded-xl border border-slate-800 bg-slate-900 p-6 text-left transition-all ${accessible
                                            ? `${section.border} cursor-pointer hover:bg-slate-800/60`
                                            : 'cursor-not-allowed opacity-40'
                                        }`}
                                >
                                    <h2
                                        className={`text-xl font-bold ${section.color}`}
                                    >
                                        {section.label}
                                    </h2>

                                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                        {section.description}
                                    </p>

                                    <div className="mt-6">
                                        <span
                                            className={`text-xs ${accessible
                                                    ? 'text-slate-500 group-hover:text-slate-300'
                                                    : 'text-slate-600'
                                                }`}
                                        >
                                            {accessible
                                                ? 'Ingresar →'
                                                : 'Sin permisos'}
                                        </span>
                                    </div>
                                </button>
                            );
                        }
                    )}
                </div>
            </div>
        );
    }

    const section = SECTIONS[activeSection];
    const visibleItems = getVisibleItems(section);

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

                <h1
                    className={`text-2xl font-bold ${section.color}`}
                >
                    {section.label}
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                    {section.description}
                </p>
            </div>

            {visibleItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                    {visibleItems.map(item => (
                        <Link
                            key={item.key}
                            to={item.path}
                            className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-600 hover:bg-slate-800/60"
                        >
                            <h3
                                className={`text-lg font-semibold ${item.color}`}
                            >
                                {item.label}
                            </h3>

                            {!item.hideCount && (
                                <p className="mt-2 text-3xl font-extrabold">
                                    {isLoading
                                        ? '...'
                                        : isError
                                            ? '—'
                                            : summary?.[item.key] ?? 0}
                                </p>
                            )}

                            <span className="mt-3 inline-block text-xs text-slate-500 group-hover:text-slate-300">
                                {item.hideCount
                                    ? 'Ver avisos →'
                                    : 'Ver y administrar →'}
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                    <h2 className="text-lg font-semibold text-slate-300">
                        Sin opciones disponibles
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        No tenés permisos para administrar los
                        elementos de esta sección.
                    </p>
                </div>
            )}
        </div>
    );
}
