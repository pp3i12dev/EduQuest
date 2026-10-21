
import fondo from '../assets/images/fondo.png';

export default function BackgroundLayout({ children }) {
    return (
        <div className="relative min-h-screen bg-[#151820]">

            {/* Fondo principal */}
            <div
                className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${fondo})`,
                }}
            />

            {/* Contenido */}
            <div className="relative z-10 min-h-screen">
                {children}
            </div>

        </div>
    );
}
