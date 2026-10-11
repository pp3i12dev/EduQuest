import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboard';
import { hasAny } from '../config/permissions';

const SECTIONS = {
    users: {
        label: 'Gestión de usuarios',
        description:
            'Administra los usuarios y sus roles dentro de la institución.',
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
            'Configura la estructura académica de la institución.',
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

    assignments: {
        label: 'Asignaciones',
        description:
            'Relaciona alumnos, docentes, materias, cursos y horarios.',
        color: 'text-violet-400',
        border: 'hover:border-violet-500/50',
        items: [
            {
                key: 'studentAssignments',
                label: 'Alumnos por curso',
                color: 'text-blue-400',
                path: '/dashboard/assignments/students',
                action: 'student:enroll',
            },
            {
                key: 'teacherAssignments',
                label: 'Docentes y materias',
                color: 'text-emerald-400',
                path: '/dashboard/assignments/teachers',
                action: 'teacher:assignSubject',
            },
            {
                key: 'schedules',
                label: 'Horarios y turnos',
                color: 'text-violet-400',
                path: '/dashboard/assignments/schedules',
                action: 'schedule:manage',
            },
        ],
    },
};

export default function DashboardView() {
    const { user } = useContext(AuthContext);

    const {
        data: summary,
        isLoading,
        isError,
    } = useDashboardSummary();

    const [activeSection, setActiveSection] =
        useState(null);

    const getVisibleItems = (section) =>
        section.items.filter((item) =>
            hasAny(user?.roles, item.action)
        );

    const canAccessSection = (section) =>
        getVisibleItems(section).length > 0;

    if (!activeSection) {
        return (
            <div>
                <p className="text-white text-sm lg:text-xl mb-8">
                    Hola de nuevo, {user?.firstName}!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(SECTIONS).map(
                        ([key, section]) => {
                            const accessible =
                                canAccessSection(
                                    section
                                );

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() =>
                                        accessible &&
                                        setActiveSection(
                                            key
                                        )
                                    }
                                    disabled={!accessible}
                                    className={`text-left bg-slate-900 border border-slate-800 p-6 rounded-xl transition-all group ${accessible
                                        ? `${section.border} hover:bg-slate-800/60 cursor-pointer`
                                        : 'opacity-40 cursor-not-allowed'
                                        }`}
                                >
                                    <h2
                                        className={`text-xl font-bold ${section.color}`}
                                    >
                                        {section.label}
                                    </h2>

                                    <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                                        {
                                            section.description
                                        }
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

    const visibleItems =
        getVisibleItems(section);

    return (
        <div>
            <div className="mb-8">
                <button
                    type="button"
                    onClick={() =>
                        setActiveSection(null)
                    }
                    className="text-sm md:text-base text-white hover:text-slate-300 transition-colors mb-4 cursor-pointer"
                >
                    ← Volver al panel principal
                </button>

                <h1
                    className={`text-2xl font-bold ${section.color}`}
                >
                    {section.label}
                </h1>

                <p className="text-slate-400 text-sm mt-2">
                    {section.description}
                </p>
            </div>

            {visibleItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {visibleItems.map((item) => (
                        <Link
                            key={item.key}
                            to={item.path}
                            className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-600 hover:bg-slate-800/60 transition-colors group cursor-pointer"
                        >
                            <h3
                                className={`text-lg font-semibold ${item.color}`}
                            >
                                {item.label}
                            </h3>

                            <p className="text-3xl font-extrabold mt-2">
                                {isLoading
                                    ? '...'
                                    : isError
                                        ? '—'
                                        : summary?.[
                                        item.key
                                        ] ?? 0}
                            </p>

                            <span className="text-xs text-slate-500 mt-3 inline-block group-hover:text-slate-300">
                                Ver y administrar →
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                    <h2 className="text-lg font-semibold text-slate-300">
                        Sin opciones disponibles
                    </h2>

                    <p className="text-sm text-slate-500 mt-2">
                        No tenés permisos para administrar los
                        elementos de esta sección.
                    </p>
                </div>
            )}
        </div>
    );
}