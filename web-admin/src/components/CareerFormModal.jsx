
import { useState, useEffect } from 'react';

const LEVELS = [
    { value: 'JARDIN', label: 'Jardín' },
    { value: 'PRIMARIO', label: 'Primario' },
    { value: 'SECUNDARIO', label: 'Secundario' },
    { value: 'TERCIARIO', label: 'Terciario' },
    { value: 'UNIVERSITARIO', label: 'Universitario' },
    { value: 'POSTGRADO', label: 'Postgrado' },
    { value: 'CURSO', label: 'Curso' },
    { value: 'OTRO', label: 'Otro' },
];

const emptyForm = {
    nombre: '',
    level: 'PRIMARIO',
    institutionId: '',
};

export default function CareerFormModal({
    open,
    initialData,
    onSubmit,
    onClose,
    isSaving = false,
    institutions = [],
    isSuperAdmin = false,
    formError = '',
}) {
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!open) return;

        setForm(
            initialData
                ? {
                    nombre: initialData.nombre ?? '',
                    level: initialData.level ?? 'PRIMARIO',
                    institutionId:
                        initialData.institutionId != null
                            ? String(initialData.institutionId)
                            : '',
                }
                : { ...emptyForm }
        );
    }, [initialData, open]);

    if (!open) return null;

    const handleSubmit = (event) => {
        event.preventDefault();

        const nombre = form.nombre.trim();
        if (!nombre) return;

        const payload = {
            nombre,
            level: form.level,
        };

        if (isSuperAdmin) {
            const institutionId = Number(form.institutionId);

            if (!Number.isInteger(institutionId) || institutionId <= 0) {
                return;
            }

            payload.institutionId = institutionId;
        }

        if (initialData?.id) {
            payload.id = initialData.id;
        }

        onSubmit(payload);
    };

    const inputClass =
        'w-full bg-slate-800 border border-slate-700 rounded ' +
        'px-3 py-2 text-sm text-white focus:outline-none ' +
        'focus:ring-2 focus:ring-blue-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
            >
                <h3 className="text-xl font-semibold">
                    {initialData ? 'Editar' : 'Nueva'} carrera / nivel
                </h3>

                {isSuperAdmin && (
                    <div className="space-y-2">
                        <label
                            htmlFor="career-institution"
                            className="block text-sm font-medium"
                        >
                            Institución
                        </label>

                        <select
                            id="career-institution"
                            value={form.institutionId}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    institutionId: event.target.value,
                                }))
                            }
                            required
                            className={inputClass}
                        >
                            <option value="">Seleccionar institución</option>

                            {institutions
                                .filter(
                                    (institution) =>
                                        institution.isActive ||
                                        institution.id === Number(form.institutionId)
                                )
                                .map((institution) => (
                                    <option key={institution.id} value={institution.id}>
                                        {institution.nombre}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}

                <div className="space-y-2">
                    <label
                        htmlFor="career-name"
                        className="block text-sm font-medium"
                    >
                        Nombre
                    </label>

                    <input
                        id="career-name"
                        value={form.nombre}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                nombre: event.target.value,
                            }))
                        }
                        placeholder="Ej.: Tecnicatura en Programación"
                        required
                        maxLength={150}
                        className={inputClass}
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="career-level"
                        className="block text-sm font-medium"
                    >
                        Nivel educativo
                    </label>

                    <select
                        id="career-level"
                        value={form.level}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                level: event.target.value,
                            }))
                        }
                        required
                        className={inputClass}
                    >
                        {LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                                {level.label}
                            </option>
                        ))}
                    </select>
                </div>

                {formError && (
                    <p role="alert" className="text-sm text-red-400">
                        {formError}
                    </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded px-4 py-2 text-slate-300 hover:bg-slate-800"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="cursor-pointer rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}
