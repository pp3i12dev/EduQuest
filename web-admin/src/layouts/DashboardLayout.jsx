
import { useContext } from 'react';
import {
    Link,
    NavLink,
    Outlet,
    useLocation,
} from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import BackgroundLayout from './BackgroundLayout';
import logo from '../assets/images/logo2.png';

export default function DashboardLayout() {
    const { user, logoutContext } = useContext(AuthContext);
    const location = useLocation();

    const isRoot = location.pathname === '/dashboard';

    const roles = Array.isArray(user?.roles)
        ? user.roles
        : [];

    return (
        <BackgroundLayout>
            <div className="min-h-screen text-white">
                <header className="border-b border-slate-800 bg-slate-700 px-4 py-5 md:px-8 md:py-6">
                    <div className="flex flex-wrap items-center justify-between gap-5">
                        <div className="flex min-w-0 items-center gap-4 md:gap-6">
                            <Link
                                to="/dashboard"
                                className="shrink-0 cursor-pointer"
                            >
                                <img
                                    src={logo}
                                    alt="EduQuest"
                                    className="h-12 w-auto object-contain md:h-16"
                                />
                            </Link>

                            <div className="min-w-0">
                                <h1 className="truncate text-xl font-bold">
                                    {user?.firstName || 'Usuario'}
                                </h1>

                                <div className="mt-1 flex flex-wrap gap-2">
                                    {user?.isSuperAdmin &&
                                        !roles.includes('SUPER_ADMIN') && (
                                            <span className="text-xs font-semibold uppercase text-amber-400">
                                                Superadministrador
                                            </span>
                                        )}

                                    {roles.map(role => (
                                        <span
                                            key={role}
                                            className="text-xs font-semibold uppercase text-blue-400"
                                        >
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <NavLink
                                to="/dashboard/early-notices"
                                className={({ isActive }) =>
                                    `cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${isActive
                                        ? 'border-blue-400 bg-blue-600 text-white'
                                        : 'border-slate-500 bg-slate-800 text-slate-200 hover:border-blue-400 hover:text-white'
                                    }`
                                }
                            >
                                Avisos Tempranos
                            </NavLink>

                            <button
                                type="button"
                                onClick={logoutContext}
                                className="cursor-pointer rounded border border-red-500/30 bg-red-600/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-600/30"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>

                    {!isRoot && (
                        <div className="mt-4">
                            <Link
                                to="/dashboard"
                                className="cursor-pointer text-sm text-slate-300 transition-colors hover:text-white"
                            >
                                ← Volver al panel principal
                            </Link>
                        </div>
                    )}
                </header>

                <main className="p-4 md:p-8">
                    <Outlet />
                </main>
            </div>
        </BackgroundLayout>
    );
}
