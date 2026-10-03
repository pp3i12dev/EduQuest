
import { useContext } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BackgroundLayout from './BackgroundLayout';

export default function DashboardLayout() {
    const { user, logoutContext } = useContext(AuthContext);
    const location = useLocation();
    const isRoot = location.pathname === '/dashboard';

    return (
        <BackgroundLayout>
            <div className="min-h-screen text-white">

                <header className="flex justify-between items-center px-8 py-12 border-b border-slate-800 bg-slate-700">
                    <div className="flex items-center gap-4">
                        {!isRoot && (
                            <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm">
                                ← Volver
                            </Link>
                        )}

                        <div>
                            <h1 className="text-xl font-bold">
                                {user?.firstName || 'Usuario'}
                            </h1>

                            <p className="text-slate-400 text-xs">
                                {user?.roles?.map((r) => (
                                    <span
                                        key={r}
                                        className="uppercase text-blue-400 font-semibold mr-2"
                                    >
                                        {r}
                                    </span>
                                ))}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={logoutContext}
                        className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded hover:bg-red-600/30 transition-colors cursor-pointer text-sm"
                    >
                        Cerrar Sesión
                    </button>
                </header>

                <main className="p-8">
                    <Outlet />
                </main>

            </div>
        </BackgroundLayout>
    );
}

