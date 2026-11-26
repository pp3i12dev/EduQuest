
import fondo from '../assets/images/fondo.png';

export default function BackgroundLayout({ children, variant = 'default' }) {
    return (
        <div className={variant === 'campus' ? 'relative min-h-screen bg-[#0B1C30]' : 'relative min-h-screen bg-[#151820]'}>

            {/* Fondo principal */}
            {variant === 'campus' ? <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(65,160,166,.13),transparent_36%),radial-gradient(circle_at_18%_85%,rgba(72,99,140,.17),transparent_44%),linear-gradient(145deg,#132438_0%,#101e30_58%,#182436_100%)]" />
                : <div className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${fondo})` }} />}

            {/* Contenido */}
            <div className="relative z-10 min-h-screen">
                {children}
            </div>

        </div>
    );
}
