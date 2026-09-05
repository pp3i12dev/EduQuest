import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const ROLE_SECTIONS = [
    {
        key: 'students',
        label: 'Alumnos',
        color: 'text-blue-400',
        path: '/dashboard/students',
    },
    {
        key: 'teachers',
        label: 'Docentes',
        color: 'text-emerald-400',
        path: '/dashboard/teachers',
    },
    {
        key: 'preceptors',
        label: 'Preceptores',
        color: 'text-purple-400',
        path: '/dashboard/preceptors',
    },
    {
        key: 'directors',
        label: 'Directivos',
        color: 'text-amber-400',
        path: '/dashboard/directors',
    },
    {
        key: 'invitations',
        label: 'Invitaciones Activas',
        color: 'text-pink-400',
        path: '/dashboard/invitations',
    },
];

function useDashboardSummary() {
    return useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: async () => {
            const { data } = await api.get('/dashboard/summary');
            return data;
            // Esperado del backend: { students: 12, teachers: 4, preceptors: 2, directors: 1, invitations: 3 }
        },
    });
}

export default function DashboardView() {
    const { user, logoutContext } = useContext(AuthContext);
    const { data: summary, isLoading, isError } = useDashboardSummary();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <header className="flex justify-between items-center pb-6 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold">Bienvenido, {user?.firstName || 'Usuario'}</h1>
                    <p className="text-slate-400 text-xs">
                        {user?.roles?.map((r) => (
                            <span key={r} className="uppercase text-blue-400 font-semibold mr-2">{r}</span>
                        ))}
                    </p>
                </div>
                <button
                    onClick={logoutContext}
                    className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded hover:bg-red-600/30 transition-colors"
                >
                    Cerrar Sesión
                </button>
            </header>

            <main className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {ROLE_SECTIONS.map((section) => (
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
            </main>
        </div>
    );
}