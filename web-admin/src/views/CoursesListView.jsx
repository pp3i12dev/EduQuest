
import { useContext, useMemo, useState } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Users,
    BookOpen,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';

import {
    useCoursesAdmin,
    useCreateCourse,
    useUpdateCourse,
    useDeleteCourse,
} from '../hooks/useCourseAdmin';

import { useInstitutions } from '../hooks/useInstitution';

import CourseFormModal from '../components/CourseFormModal';
import CourseStudentsManager from '../components/CourseStudentsManager';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchInput from '../components/SearchInput';

function getErrorMessage(error) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        'Ocurrió un error al realizar la operación.'
    );
}

export default function CoursesListView() {
    const { user } = useContext(AuthContext);

    const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

    const {
        data: courses = [],
        isLoading,
        error,
    } = useCoursesAdmin();

    const { data: institutions = [] } = useInstitutions();

    const createMutation = useCreateCourse();
    const updateMutation = useUpdateCourse();
    const deleteMutation = useDeleteCourse();

    const [search, setSearch] = useState('');
    const [selectedInstitution, setSelectedInstitution] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [deletingCourse, setDeletingCourse] = useState(null);

    const [selectedCourseId, setSelectedCourseId] = useState(null);

    const [formError, setFormError] = useState('');
    const [actionError, setActionError] = useState('');

    const institutionMap = useMemo(
        () => new Map(institutions.map((item) => [item.id, item.nombre])),
        [institutions]
    );

    const filteredCourses = useMemo(() => {
        const term = search.trim().toLocaleLowerCase('es');

        return courses.filter((course) => {
            const matchesInstitution =
                !isSuperAdmin ||
                !selectedInstitution ||
                String(course.institutionId) === selectedInstitution;

            const searchable = [
                course.nombre,
                course.academicYear,
                course.career?.nombre,
                course.career?.level,
                course.institution?.nombre,
                institutionMap.get(course.institutionId),
                course.id,
            ]
                .filter((value) => value != null)
                .join(' ')
                .toLocaleLowerCase('es');

            return matchesInstitution && searchable.includes(term);
        });
    }, [
        courses,
        search,
        selectedInstitution,
        isSuperAdmin,
        institutionMap,
    ]);

    const selectedCourse = courses.find(
        (course) => course.id === selectedCourseId
    );

    const openCreate = () => {
        setEditingCourse(null);
        setFormError('');
        setFormOpen(true);
    };

    const openEdit = (course) => {
        setEditingCourse(course);
        setFormError('');
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingCourse(null);
        setFormError('');
    };

    const handleSubmit = (payload) => {
        setFormError('');

        const mutation = payload.id
            ? updateMutation
            : createMutation;

        mutation.mutate(payload, {
            onSuccess: closeForm,
            onError: (mutationError) => {
                setFormError(getErrorMessage(mutationError));
            },
        });
    };

    const handleDelete = () => {
        if (!deletingCourse) return;

        setActionError('');

        deleteMutation.mutate(deletingCourse.id, {
            onSuccess: () => {
                if (selectedCourseId === deletingCourse.id) {
                    setSelectedCourseId(null);
                }

                setDeletingCourse(null);
            },
            onError: (mutationError) => {
                setActionError(getErrorMessage(mutationError));
                setDeletingCourse(null);
            },
        });
    };

    const toggleStudents = (courseId) => {
        setSelectedCourseId((current) =>
            current === courseId ? null : courseId
        );
    };

    const buttonClass =
        'inline-flex cursor-pointer items-center justify-center gap-2 ' +
        'rounded-lg px-3 py-2 text-sm font-medium transition-colors';

    return (
        <div className="space-y-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-3 text-2xl font-bold">
                        <BookOpen className="text-blue-400" />
                        Gestión de cursos
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                        Administrá los cursos y sus alumnos.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreate}
                    className={`${buttonClass} bg-blue-600 hover:bg-blue-700`}
                >
                    <Plus size={18} />
                    Nuevo curso
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar curso, carrera o año lectivo..."
                />

                {isSuperAdmin && (
                    <select
                        value={selectedInstitution}
                        onChange={(event) => {
                            setSelectedInstitution(event.target.value);
                            setSelectedCourseId(null);
                        }}
                        className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm"
                    >
                        <option value="">Todas las instituciones</option>

                        {institutions.map((institution) => (
                            <option key={institution.id} value={institution.id}>
                                {institution.nombre}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {actionError && (
                <p role="alert" className="text-sm text-red-400">
                    {actionError}
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-400">
                    {getErrorMessage(error)}
                </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/90">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                        <tr>
                            <th className="px-4 py-3">Curso</th>
                            <th className="px-4 py-3">Carrera / Nivel</th>
                            <th className="px-4 py-3">Año lectivo</th>

                            {isSuperAdmin && (
                                <th className="px-4 py-3">Institución</th>
                            )}

                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={isSuperAdmin ? 5 : 4}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    Cargando cursos...
                                </td>
                            </tr>
                        ) : filteredCourses.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={isSuperAdmin ? 5 : 4}
                                    className="px-4 py-8 text-center text-slate-400"
                                >
                                    No se encontraron cursos.
                                </td>
                            </tr>
                        ) : (
                            filteredCourses.map((course) => {
                                const isSelected =
                                    selectedCourseId === course.id;

                                return (
                                    <tr
                                        key={course.id}
                                        className={
                                            isSelected
                                                ? 'bg-blue-950/40'
                                                : 'hover:bg-slate-800/40'
                                        }
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {course.nombre}
                                        </td>

                                        <td className="px-4 py-3">
                                            {course.career?.nombre || (
                                                <span className="text-amber-400">
                                                    Sin carrera asignada
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            {course.academicYear}
                                        </td>

                                        {isSuperAdmin && (
                                            <td className="px-4 py-3">
                                                {course.institution?.nombre ||
                                                    institutionMap.get(course.institutionId) ||
                                                    'Sin información'}
                                            </td>
                                        )}

                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleStudents(course.id)}
                                                    className={`${buttonClass} ${isSelected
                                                            ? 'bg-blue-700 text-white'
                                                            : 'border border-blue-500/50 text-blue-300 hover:bg-blue-500/10'
                                                        }`}
                                                >
                                                    <Users size={16} />
                                                    Alumnos
                                                    {isSelected ? (
                                                        <ChevronUp size={15} />
                                                    ) : (
                                                        <ChevronDown size={15} />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(course)}
                                                    title="Editar curso"
                                                    aria-label={`Editar ${course.nombre}`}
                                                    className={`${buttonClass} border border-slate-600 text-slate-200 hover:bg-slate-700`}
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingCourse(course)}
                                                    title="Eliminar curso"
                                                    aria-label={`Eliminar ${course.nombre}`}
                                                    className={`${buttonClass} border border-red-500/50 text-red-400 hover:bg-red-500/10`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {selectedCourse && (
                <CourseStudentsManager
                    key={selectedCourse.id}
                    course={selectedCourse}
                />
            )}

            <CourseFormModal
                open={formOpen}
                initialData={editingCourse}
                onSubmit={handleSubmit}
                onClose={closeForm}
                isSaving={
                    createMutation.isPending || updateMutation.isPending
                }
                institutionId={
                    isSuperAdmin
                        ? selectedInstitution || editingCourse?.institutionId || null
                        : user?.institutionId ?? null
                }
                formError={formError}
            />

            <ConfirmDialog
                open={Boolean(deletingCourse)}
                title="Eliminar curso"
                message={
                    deletingCourse
                        ? `¿Confirmás eliminar "${deletingCourse.nombre}"? Si tiene alumnos, docentes u horarios asociados, el backend puede impedir la eliminación.`
                        : ''
                }
                confirmLabel="Eliminar"
                onConfirm={handleDelete}
                onCancel={() => setDeletingCourse(null)}
            />
        </div>
    );
}
