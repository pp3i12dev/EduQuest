
import { useState, useEffect } from 'react';
import { useInstitutions } from '../hooks/useInstitution';
import { useCareersAdmin } from '../hooks/useCareerAdmin';
import { SHIFTS } from '../utils/courseShift';

const currentYear = new Date().getFullYear();

const emptyForm = () => ({
    nombre: '',
    academicYear: String(currentYear),
    careerId: '',
    institutionId: '',
    shift: '',
});

export default function CourseFormModal({
    open,
    initialData,
    onSubmit,
    onClose,
    isSaving = false,
    formError = '',
    institutionId = null,
    isSuperAdmin = false,
}) {
    const { data: careers = [], isLoading } = useCareersAdmin();
    const { data: institutions = [] } = useInstitutions(open && isSuperAdmin);
    const availableInstitutions = Array.isArray(institutions) ? institutions : (institutions?.institutions ?? []);

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
                    institutionId: String(initialData.institutionId ?? institutionId ?? ''),
                    shift: initialData.shift ?? '',
                    careerId:
                        initialData.careerId != null
                            ? String(initialData.careerId)
                            : '',
                }
                : { ...emptyForm(), institutionId: String(institutionId ?? '') }
        );
    }, [initialData, open, institutionId]);

    if (!open) return null;

    const availableCareers = careers.filter(
        career => Number(career.institutionId) === Number(form.institutionId)
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

        if (!SHIFTS.some(item => item.value === form.shift)) return;
        const payload = { nombre, academicYear, careerId, shift: form.shift };
        if (isSuperAdmin && !initialData?.id) {
            if (!Number(form.institutionId)) return;
            payload.institutionId = Number(form.institutionId);
        }

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

                {isSuperAdmin && <label className="block space-y-1 text-sm font-medium">
                    Institución
                    <select value={form.institutionId} disabled={Boolean(initialData)} required
                        onChange={e => setForm(old => ({ ...old, institutionId: e.target.value, careerId: '' }))}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white">
                        <option value="">Seleccionar institución</option>
                        {availableInstitutions.filter(i => i.isActive || i.id === Number(form.institutionId)).map(i =>
                            <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                </label>}
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

                <div className="space-y-2">
                    <label htmlFor="course-shift" className="block text-sm font-medium">Turno del curso</label>
                    <select id="course-shift" value={form.shift} required onChange={e => setForm(current => ({ ...current, shift: e.target.value }))} className={inputClass}>
                        <option value="">Elegí el turno</option>
                        {SHIFTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    {initialData && !initialData.shift && <p className="text-xs text-amber-300">Este curso fue creado antes de incorporar turnos. Elegí su turno real antes de guardar.</p>}
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
