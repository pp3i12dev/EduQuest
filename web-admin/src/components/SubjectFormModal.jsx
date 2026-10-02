import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCoursesAdmin } from '../hooks/useCourseAdmin';
import { usersService } from '../services/users.service';
import { subjectAdminService } from '../services/subjectAdmin.service';

export default function SubjectFormModal({ open, initialData, onSubmit, onClose, isSaving, formError }) {
    const { data: courses = [] } = useCoursesAdmin();
    const { data: teachers = [] } = useQuery({
        queryKey: ['subject-teachers'],
        queryFn: () => usersService.list('teacher'),
    });
    const { data: games = [] } = useQuery({
        queryKey: ['subject-games'],
        queryFn: subjectAdminService.listGames,
    });
    const [form, setForm] = useState({ nombre: '', teacherId: '', courseId: '', moduleTitle: '', gameType: '' });

    useEffect(() => {
        setForm({ nombre: initialData?.nombre ?? '', teacherId: '', courseId: '', moduleTitle: '', gameType: '' });
    }, [initialData, open]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(initialData ? { id: initialData.id, nombre: form.nombre } : {
            nombre: form.nombre,
            teacherId: Number(form.teacherId),
            courseId: Number(form.courseId),
            moduleTitle: form.moduleTitle,
            gameType: form.gameType,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="text-lg font-semibold">{initialData ? 'Editar' : 'Nueva'} materia</h3>
                <input value={form.nombre} onChange={(e) => setForm((current) => ({ ...current, nombre: e.target.value }))} placeholder="Nombre (ej: Matemática)" required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                {!initialData && <>
                    <select value={form.teacherId} onChange={(e) => setForm((current) => ({ ...current, teacherId: e.target.value }))} required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                        <option value="">Seleccionar docente</option>
                        {teachers.filter((teacher) => teacher.isActive).map((teacher) => (
                            <option key={teacher.profile.id} value={teacher.profile.id}>{teacher.firstName} {teacher.lastName}</option>
                        ))}
                    </select>
                    <select value={form.courseId} onChange={(e) => setForm((current) => ({ ...current, courseId: e.target.value }))} required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                        <option value="">Seleccionar curso</option>
                        {courses.map((course) => <option key={course.id} value={course.id}>{course.nombre}</option>)}
                    </select>
                    <label className="block space-y-1 text-sm">
                        <span>Módulo</span>
                        <input value={form.moduleTitle} onChange={(e) => setForm((current) => ({ ...current, moduleTitle: e.target.value }))} placeholder="Nombre del módulo" required
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
                    </label>
                    <select value={form.gameType} onChange={(e) => setForm((current) => ({ ...current, gameType: e.target.value }))} required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                        <option value="">Seleccionar juego</option>
                        {games.map((game) => <option key={game.id} value={game.id}>{game.nombre}</option>)}
                    </select>
                </>}
                {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800">Volver / cerrar</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}