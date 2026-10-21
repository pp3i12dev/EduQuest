
import { useState, useEffect } from 'react';
import { useCareersAdmin } from '../hooks/useCareerAdmin';

const currentYear = new Date().getFullYear();

const emptyForm = () => ({
    nombre: '',
    academicYear: String(currentYear),
    careerId: '',
});

export default function CourseFormModal({
    open,
    initialData,
    onSubmit,
    onClose,
    isSaving = false,
    formError = '',
    institutionId = null,
}) {
    const { data: careers = [], isLoading } = useCareersAdmin();

    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!open) return;

        setForm(
            initialData
                ? {
                    nombre: initialData.nombre ?? '',
                    academicYear: String(
                        initialData.academicYear ?? currentYear
                    ),
                    careerId:
                        initialData.careerId != null
                            ? String(initialData.careerId)
                            : '',
                }
                : emptyForm()
        );
    }, [initialData, open]);

    if (!open) return null;

    const availableCareers = careers.filter(
        (career) =>
            institutionId == null ||
            Number(career.institutionId) === Number(institutionId)
    );

    const handleSubmit = (event) => {
        event.preventDefault();

        const nombre = form.nombre.trim();
        const academicYear = Number(form.academicYear);
        const careerId = Number(form.careerId);

        if (!nombre) return;

        if (
            !Number.isInteger(academicYear) ||
            academicYear < 1900 ||
            academicYear > 2200
        ) {
            return;
        }

        if (!Number.isInteger(careerId) || careerId <= 0) {
            return;
        }

        const payload = {
            nombre,
            academicYear,
            careerId,
        };

        if (initialData?.id) {
            payload.id = initialData.id;
        }

        onSubmit(payload);
    };

    const inputClass =
        'w-full rounded border border-slate-700 bg-slate-800 ' +
        'px-3 py-2 text-sm text-white focus:outline-none ' +
        'focus:ring-2 focus:ring-blue-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
            >
                <h3 className="text-xl font-semibold">
                    {initialData ? 'Editar' : 'Nuevo'} curso
                </h3>

                <div className="space-y-2">
                    <label
                        htmlFor="course-name"
                        className="block text-sm font-medium"
                    >
                        Nombre del curso
                    </label>

                    <input
                        id="course-name"
                        value={form.nombre}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                nombre: event.target.value,
                            }))
                        }
                        placeholder="Ej.: 5.º A"
                        required
                        maxLength={100}
                        className={inputClass}
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="course-year"
                        className="block text-sm font-medium"
                    >
                        Año lectivo
                    </label>

                    <input
                        id="course-year"
                        type="number"
                        min="1900"
                        max="2200"
                        step="1"
                        value={form.academicYear}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                academicYear: event.target.value,
                            }))
                        }
                        required
                        className={inputClass}
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="course-career"
                        className="block text-sm font-medium"
                    >
                        Carrera / Nivel educativo
                    </label>

                    <select
                        id="course-career"
                        value={form.careerId}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                careerId: event.target.value,
                            }))
                        }
                        required
                        disabled={isLoading}
                        className={inputClass}
                    >
                        <option value="">
                            {isLoading
                                ? 'Cargando carreras...'
                                : 'Seleccionar carrera / nivel'}
                        </option>

                        {availableCareers.map((career) => (
                            <option key={career.id} value={career.id}>
                                {career.nombre} ({career.level})
                            </option>
                        ))}
                    </select>

                    {!isLoading && availableCareers.length === 0 && (
                        <p className="text-xs text-amber-400">
                            Primero debés crear una carrera o nivel educativo
                            para esta institución.
                        </p>
                    )}
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
                        disabled={isSaving || isLoading || !availableCareers.length}
                        className="cursor-pointer rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}
