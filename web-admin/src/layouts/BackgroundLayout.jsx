
import aula from '../assets/images/aula.jpg';

export default function BackgroundLayout({ children }) {
    return (
        <div className="min-h-screen relative overflow-hidden">

            {/* Fondo */}
            <div
                className="fixed inset-0 bg-cover bg-center blur-sm scale-105"
                style={{ backgroundImage: `url(${aula})` }}
            />

            {/* Capa oscura */}
            <div className="fixed inset-0 bg-slate-900/70" />

            {/* Contenido */}
            <div className="relative z-10 min-h-screen">
                {children}
            </div>

        </div>
    );
}

