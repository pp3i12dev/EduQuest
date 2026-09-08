import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboard';
import { hasAny } from '../config/permissions';

const ROLE_SECTIONS = [
    { key: 'students', label: 'Alumnos', color: 'text-blue-400', path: '/dashboard/students', action: 'student:view' },
    { key: 'teachers', label: 'Docentes', color: 'text-emerald-400', path: '/dashboard/teachers', action: 'teacher:manage' },
    { key: 'preceptors', label: 'Preceptores', color: 'text-purple-400', path: '/dashboard/preceptors', action: 'preceptor:manage' },
    { key: 'directors', label: 'Directivos', color: 'text-amber-400', path: '/dashboard/directors', action: 'director:manage' },
    { key: 'invitations', label: 'Invitaciones Activas', color: 'text-pink-400', path: '/dashboard/invitations', action: 'invitation:manage' },
    { key: 'careers', label: 'Carreras / Niveles', color: 'text-cyan-400', path: '/dashboard/careers', action: 'course:manage' },
    { key: 'courses', label: 'Cursos', color: 'text-teal-400', path: '/dashboard/courses', action: 'course:manage' },
    { key: 'subjects', label: 'Materias', color: 'text-lime-400', path: '/dashboard/subjects', action: 'course:manage' },
    { key: 'institutions', label: 'Institución', color: 'text-orange-400', path: '/dashboard/institution', action: 'institution:manage' },
];

export default function DashboardView() {
    const { user } = useContext(AuthContext);
    const { data: summary, isLoading, isError } = useDashboardSummary();

    const visibleSections = ROLE_SECTIONS.filter((s) => hasAny(user?.roles, s.action));

    return (
        <div>
            <p className="text-slate-400 text-sm mb-6">Hola de nuevo, {user?.firstName}.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {visibleSections.map((section) => (
                    <Link
                        key={section.key}
                        to={section.path}
                        className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-slate-600 hover:bg-slate-800/60 transition-colors group"
                    >
                        <h3 className={`text-lg font-semibold ${section.color}`}>{section.label}</h3>
                        <p className="text-3xl font-extrabold mt-2">
                            {isLoading ? '...' : isError ? '—' : summary?.[section.key] ?? 0}
                        </p>
                        <span className="text-xs text-slate-500 mt-3 inline-block group-hover:text-slate-300">
                            Ver y administrar →
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}