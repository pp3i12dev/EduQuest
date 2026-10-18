
import { Search, X } from 'lucide-react';

export default function SearchInput({
    value,
    onChange,
    placeholder = 'Buscar por nombre, apellido, DNI, email o legajo...',
    className = '',
}) {
    return (
        <div className={`relative w-full max-w-lg ${className}`}>
            <Search
                size={19}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label="Buscar registros"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />

            {value.length > 0 && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Limpiar búsqueda"
                    title="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-white"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
}
