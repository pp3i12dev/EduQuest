import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useCareers, useCoursesByCareer } from '../hooks/useAcademic';

const baseEmpty = { dni: '', email: '', firstName: '', lastName: '', password: '' };

const ROLE_EXTRA_FIELDS = {
    student: { legajoStudent: '' },
    teacher: { legajoTeacher: '', specialty: '' },
    preceptor: { legajoPreceptor: '', shift: '' },
    director: { position: '' },
};

export default function UserFormModal({ open, role, initialData, onSubmit, onClose, isSaving }) {
    const { user } = useContext(AuthContext);
    const isEditing = Boolean(initialData?.id);

    const [form, setForm] = useState({ ...baseEmpty, ...ROLE_EXTRA_FIELDS[role] });
    const [careerId, setCareerId] = useState('');
    const [courseId, setCourseId] = useState('');

    const { data: careers } = useCareers(user?.institutionId);
    const { data: courses } = useCoursesByCareer(careerId);

    useEffect(() => {
        if (!open) return;

        if (initialData) {
            setForm({
                dni: initialData.dni,
                email: initialData.email,
                firstName: initialData.firstName,
                lastName: initialData.lastName,
                password: '',
                ...(role === 'student' && { legajoStudent: initialData.profile?.legajoStudent ?? '' }),
                ...(role === 'teacher' && {
                    legajoTeacher: initialData.profile?.legajoTeacher ?? '',
                    specialty: initialData.profile?.specialty ?? '',
                }),
                ...(role === 'preceptor' && {
                    legajoPreceptor: initialData.profile?.legajoPreceptor ?? '',
                    shift: initialData.profile?.shift ?? '',
                }),
                ...(role === 'director' && { position: initialData.profile?.position ?? '' }),
            });
            setCourseId(initialData.profile?.currentCourseId ?? '');
        } else {
            setForm({ ...baseEmpty, ...ROLE_EXTRA_FIELDS[role] });
            setCourseId('');
        }
        setCareerId('');
    }, [initialData, open, role]);

    if (!open) return null;

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (isEditing && !payload.password) delete payload.password;
        if (role === 'student') payload.courseId = courseId || null;
        onSubmit(isEditing ? { id: initialData.id, ...payload } : payload);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-8">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-semibold">{isEditing ? 'Editar' : 'Nuevo'} {role}</h3>

                <div className="grid grid-cols-2 gap-4">
                    <input
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="Nombre"
                        required
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                    <input
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Apellido"
                        required
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                </div>

                <input
                    name="dni"
                    value={form.dni}
                    onChange={handleChange}
                    placeholder="DNI"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                />

                <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                />

                <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    required={!isEditing}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                />

                {role === 'student' && (
                    <>
                        <input
                            name="legajoStudent"
                            value={form.legajoStudent}
                            onChange={handleChange}
                            placeholder="Legajo"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                        <select
                            value={careerId}
                            onChange={(e) => { setCareerId(e.target.value); setCourseId(''); }}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">Elegí carrera/nivel</option>
                            {careers?.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.level})</option>
                            ))}
                        </select>
                        <select
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                            disabled={!careerId}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm disabled:opacity-50"
                        >
                            <option value="">Elegí curso</option>
                            {courses?.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </>
                )}

                {role === 'teacher' && (
                    <>
                        <input
                            name="legajoTeacher"
                            value={form.legajoTeacher}
                            onChange={handleChange}
                            placeholder="Legajo"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                        <input
                            name="specialty"
                            value={form.specialty}
                            onChange={handleChange}
                            placeholder="Especialidad"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                    </>
                )}

                {role === 'preceptor' && (
                    <>
                        <input
                            name="legajoPreceptor"
                            value={form.legajoPreceptor}
                            onChange={handleChange}
                            placeholder="Legajo"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                        <input
                            name="shift"
                            value={form.shift}
                            onChange={handleChange}
                            placeholder="Turno"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />
                    </>
                )}

                {role === 'director' && (
                    <input
                        name="position"
                        value={form.position}
                        onChange={handleChange}
                        placeholder="Cargo"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}