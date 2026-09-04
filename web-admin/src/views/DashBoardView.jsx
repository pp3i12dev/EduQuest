import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function DashboardView() {
    const { user, logoutContext } = useContext(AuthContext);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <header className="flex justify-between items-center pb-6 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold">Bienvenido, {user?.firstName || 'Usuario'}</h1>
                    <p className="text-slate-400 text-sm">Rol: <span className="uppercase text-blue-400 font-semibold">{user?.role}</span></p>
                </div>
                <button
                    onClick={logoutContext}
                    className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded hover:bg-red-600/30 transition-colors"
                >
                    Cerrar Sesión
                </button>
            </header>

            <main className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-blue-400">Alumnos</h3>
                    <p className="text-3xl font-extrabold mt-2">--</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-emerald-400">Docentes</h3>
                    <p className="text-3xl font-extrabold mt-2">--</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-400">Invitaciones Activas</h3>
                    <p className="text-3xl font-extrabold mt-2">--</p>
                </div>
            </main>
        </div>
    );
}