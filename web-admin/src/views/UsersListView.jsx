
import { useState, useMemo, useEffect } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { hasAny } from '../config/permissions';
import {
    useUsersByRole,
    useCreateUser,
    useUpdateUser,
    useToggleUserActive,
    useDeleteUser
} from '../hooks/useUsers';
import UserFormModal from '../components/UserFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

// Normaliza los textos para buscar sin distinguir
// mayúsculas, minúsculas ni acentos.
const normalizeText = (value) => {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

// Extrae los valores de los campos de un usuario,
// incluidos los datos de su perfil.
// No busca dentro de objetos de relaciones externas.
const getSearchableText = (user) => {
    const values = [];

    const collectValues = (object) => {
        if (!object || typeof object !== 'object') return;

        Object.entries(object).forEach(([key, value]) => {
            // No se incluyen contraseñas ni datos de autenticación.
            if (
                [
                    'password',
                    'passwordHash',
                    'token',
                    'refreshToken'
                ].includes(key)
            ) {
                return;
            }

            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                values.push(String(value));
            }
        });
    };

    collectValues(user);
    collectValues(user.profile);

    // Permite buscar nombre y apellido juntos,
    // independientemente de cómo se hayan escrito.
    values.push(
        `${user.firstName ?? ''} ${user.lastName ?? ''}`
    );

    values.push(
        `${user.lastName ?? ''} ${user.firstName ?? ''}`
    );

    return normalizeText(values.join(' '));
};

export default function UsersListView({ role, title }) {
    const { user: currentUser } = useContext(AuthContext);
    const canManageRole = hasAny(currentUser?.roles, `${role}:manage`);
    const canPermanentlyDelete = Boolean(currentUser?.isSuperAdmin || currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.roles?.includes('DIRECTOR'));
    const { data: users, isLoading } = useUsersByRole(role);

    const createMutation = useCreateUser(role);
    const updateMutation = useUpdateUser(role);
    const toggleMutation = useToggleUserActive(role);
    const deleteMutation = useDeleteUser(role);

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [permanentId, setPermanentId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    // Estado independiente de búsqueda para esta vista.
    const [searchTerm, setSearchTerm] = useState('');
    const [institutionFilter, setInstitutionFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [careerFilter, setCareerFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Cuando cambia el rol, limpiamos la búsqueda anterior.
    useEffect(() => {
        setSearchTerm('');
        setInstitutionFilter('');
        setCourseFilter('');
        setCareerFilter('');
        setSubjectFilter('');
        setShiftFilter('');
        setStatusFilter('');
    }, [role]);

    // Los usuarios ya vienen filtrados por rol desde el hook.
    const roleUsers = useMemo(() => {
        if (Array.isArray(users)) {
            return users;
        }

        return [];
    }, [users]);

    const institutions = useMemo(() => [...new Map(roleUsers
        .filter(u => u.institutionId != null)
        .map(u => [String(u.institutionId), u.institutionName || `Institución ${u.institutionId}`]))]
        .sort((a, b) => a[1].localeCompare(b[1], 'es')), [roleUsers]);
    const courses = useMemo(() => [...new Map(roleUsers.flatMap(u => u.academicLinks || [])
        .filter(c => c.courseId).map(c => [String(c.courseId), c.courseName || `Curso ${c.courseId}`]))]
        .sort((a, b) => a[1].localeCompare(b[1], 'es')), [roleUsers]);
    const careers = useMemo(() => [...new Map(roleUsers.flatMap(u => u.academicLinks || [])
        .filter(c => c.careerId).map(c => [String(c.careerId), c.careerName || `Carrera ${c.careerId}`]))]
        .sort((a, b) => a[1].localeCompare(b[1], 'es')), [roleUsers]);
    const subjects = useMemo(() => [...new Map(roleUsers.flatMap(u => u.academicLinks || [])
        .filter(c => c.subjectId).map(c => [String(c.subjectId), c.subjectName || `Materia ${c.subjectId}`]))]
        .sort((a, b) => a[1].localeCompare(b[1], 'es')), [roleUsers]);
    const shifts = [{ id: 'MANANA', label: 'Mañana' }, { id: 'TARDE', label: 'Tarde' }, { id: 'NOCHE', label: 'Noche' }];
    const hasFilters = Boolean(searchTerm || institutionFilter || courseFilter || careerFilter || subjectFilter || shiftFilter || statusFilter);
    const resetFilters = () => { setSearchTerm(''); setInstitutionFilter(''); setCourseFilter(''); setCareerFilter(''); setSubjectFilter(''); setShiftFilter(''); setStatusFilter(''); };

    // Filtrado en tiempo real de los usuarios del rol actual.
    const filteredUsers = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);

        // Permite buscar por varias palabras, por ejemplo:
        // "Juan Perez", "Perez Juan" o "Juan 12345678".
        const searchWords = normalizedSearch.split(/\s+/);

        return roleUsers.filter((user) => {
            if (institutionFilter && String(user.institutionId) !== institutionFilter) return false;
            if (courseFilter && !(user.academicLinks || []).some(c => String(c.courseId) === courseFilter)) return false;
            if (careerFilter && !(user.academicLinks || []).some(c => String(c.careerId) === careerFilter)) return false;
            if (subjectFilter && !(user.academicLinks || []).some(c => String(c.subjectId) === subjectFilter)) return false;
            if (shiftFilter && user.profile?.shift !== shiftFilter &&
                !(user.academicLinks || []).some(c => c.shift === shiftFilter)) return false;
            if (statusFilter === 'ACTIVE' && !user.isActive) return false;
            if (statusFilter === 'INACTIVE' && user.isActive) return false;
            if (statusFilter === 'PENDING' && user.signupStatus !== 'PENDING') return false;
            const searchableText = getSearchableText(user);
            return searchWords.every((word) => searchableText.includes(word));
        });
    }, [roleUsers, searchTerm, institutionFilter, courseFilter, careerFilter, subjectFilter, shiftFilter, statusFilter]);

    const openCreate = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setFormOpen(true);
    };

    const handleSubmit = (payload) => {
        const action = payload.id
            ? updateMutation
            : createMutation;

        action.mutate(payload, {
            onSuccess: () => setFormOpen(false)
        });
    };

    return (
        <div>
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6 gap-4">
<div className="flex flex-wrap items-center gap-3" />

                {canManageRole && <button
                    onClick={openCreate}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium cursor-pointer"
                >
                    + Agregar
                </button>}
            </div>

            {/* Barra de búsqueda */}
            <div className="mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-md">
                        {/* Icono de lupa */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Buscar por nombre, apellido, DNI, email..."
                            aria-label={`Buscar usuarios en ${title}`}
                            autoComplete="off"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />

                        {/* Botón para limpiar la búsqueda */}
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                aria-label="Limpiar búsqueda"
                                title="Limpiar búsqueda"
                                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-white"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="17"
                                    height="17"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Contador de resultados */}
                    {!isLoading && (
                        <div className="text-sm text-slate-400 whitespace-nowrap">
                            {hasFilters ? (
                                <>
                                    <span className="font-semibold text-blue-400">
                                        {filteredUsers.length}
                                    </span>
                                    {' '}de{' '}
                                    <span className="font-semibold text-slate-200">
                                        {roleUsers.length}
                                    </span>
                                    {' '}usuarios
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold text-slate-200">
                                        {roleUsers.length}
                                    </span>
                                    {' '}
                                    {roleUsers.length === 1
                                        ? 'usuario registrado'
                                        : 'usuarios registrados'}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Filtros institucionales independientes para cada rol */}
            <div className="eq-glass-panel mb-5 grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/65 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <label className="text-xs text-slate-300">Institución
                    <select value={institutionFilter} onChange={e => setInstitutionFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
                        <option value="">Todas</option>{institutions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                </label>
                {(role === 'student' || role === 'teacher') && <label className="text-xs text-slate-300">Carrera / Nivel
                    <select value={careerFilter} onChange={e => setCareerFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
                        <option value="">Todas</option>{careers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                </label>}
                {(role === 'student' || role === 'teacher') && <label className="text-xs text-slate-300">Curso
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
                        <option value="">Todos</option>{courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                </label>}
                {role === 'teacher' && <label className="text-xs text-slate-300">Materia
                    <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
                        <option value="">Todas</option>{subjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                </label>}
                {['student', 'teacher', 'preceptor'].includes(role) && <label className="text-xs text-slate-300">Turno
                    <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
                        <option value="">Todos</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </label>}
                <label className="text-xs text-slate-300">Estado
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
                        <option value="">Todos</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option><option value="PENDING">Pendientes</option>
                    </select>
                </label>
                <div className="flex items-end"><button type="button" onClick={resetFilters} disabled={!hasFilters}
                    className="w-full rounded-lg border border-slate-600 p-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50">Limpiar filtros</button></div>
            </div>

            {/* Listado de usuarios */}
            {isLoading ? (
                <p className="text-slate-400">
                    Cargando...
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm border-collapse">
                        <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-800">
                                <th className="py-2">Nombre</th>
                                <th>DNI</th>
                                <th>Email</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.map((u) => (
                                <tr
                                    key={u.id}
                                    className="border-b border-slate-900 hover:bg-slate-900/50"
                                >
                                    <td className="py-3">
                                        {u.firstName} {u.lastName}
                                    </td>

                                    <td>{u.dni}</td>

                                    <td>{u.email}</td>

                                    <td>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${u.isActive
                                                    ? 'bg-emerald-600/20 text-emerald-400'
                                                    : 'bg-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {u.signupStatus === 'PENDING' ? (role === 'student' ? 'Correo sin verificar' : 'Pendiente de aprobación')
                                                : u.signupStatus === 'REJECTED' ? 'Registro rechazado'
                                                : u.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>

                                    <td className="text-right space-x-2">
                                        {canManageRole && <button
                                            onClick={() => openEdit(u)}
                                            className="text-blue-400 hover:underline text-xs cursor-pointer"
                                        >
                                            Editar
                                        </button>}

                                        {canManageRole && <button
                                            onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                                            disabled={role === 'student' && !u.isActive && u.signupStatus === 'PENDING' && u.requestedRole === 'STUDENT'}
                                            title={role === 'student' && !u.isActive && u.signupStatus === 'PENDING' ? 'Debe verificar su correo primero' : undefined}
                                            className="text-amber-400 hover:underline text-xs disabled:opacity-30"
                                        >{u.isActive ? 'Desactivar' : 'Activar'}</button>}

                                        {canManageRole && <button
                                            onClick={() =>
                                                setDeletingId(u.id)
                                            }
                                            className="text-red-400 hover:underline text-xs cursor-pointer"
                                        >
                                            Dar de baja
                                        </button>}
                                        {canManageRole && canPermanentlyDelete && <button
                                            onClick={() => { setPermanentId(u.id); setDeleteConfirmation(''); }}
                                            className="ml-2 text-rose-300 hover:underline text-xs"
                                            title="Borrado irreversible: incluye actividades y resultados vinculados"
                                        >Eliminar definitivamente</button>}
                                    </td>
                                </tr>
                            ))}

                            {/* No hay usuarios registrados */}
                            {roleUsers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-8 text-center text-slate-500"
                                    >
                                        Sin registros.
                                    </td>
                                </tr>
                            )}

                            {/* No hay coincidencias */}
                            {roleUsers.length > 0 &&
                                filteredUsers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-10 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-3">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="32"
                                                    height="32"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                    className="text-slate-500"
                                                >
                                                    <circle
                                                        cx="11"
                                                        cy="11"
                                                        r="8"
                                                    />
                                                    <path d="m21 21-4.35-4.35" />
                                                </svg>

                                                <p className="text-slate-400">
                                                    No se encontraron usuarios que coincidan con{' '}
                                                    <span className="font-medium text-white">
                                                        "{searchTerm}"
                                                    </span>
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSearchTerm('')
                                                    }
                                                    className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                                >
                                                    Limpiar búsqueda
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de creación y edición */}
            <UserFormModal
                open={formOpen}
                role={role}
                initialData={editingUser}
                onSubmit={handleSubmit}
                onClose={() => setFormOpen(false)}
                isSaving={
                    createMutation.isPending ||
                    updateMutation.isPending
                }
            />

            {deleteMutation.isError && <div role="alert" className="mb-3 rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{deleteMutation.error?.response?.data?.message || deleteMutation.error?.message || 'No se pudo retirar el usuario.'}</div>}

            {/* Confirmación de eliminación */}
            <ConfirmDialog
                open={Boolean(deletingId)}
                title="Retirar usuario de EduQuest"
                message="El usuario perderá acceso y desaparecerá de Gestión de usuarios. Se liberarán sus asignaciones docentes y matrículas activas. Los avisos, calificaciones y registros históricos se conservarán para auditoría. ¿Confirmás?"
                confirmLabel="Retirar usuario"
                onCancel={() => setDeletingId(null)}
                onConfirm={() =>
                    deleteMutation.mutate({ id: deletingId, mode: 'archive' }, {
                        onSuccess: () =>
                            setDeletingId(null)
                    })
                }
            />
            {Boolean(permanentId) && <div role="dialog" aria-modal="true" aria-label="Borrado definitivo" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4">
                <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-[#17273d] p-6 text-slate-100 shadow-2xl">
                    <h2 className="text-xl font-bold text-white">Eliminar definitivamente</h2>
                    <p className="mt-3 text-sm text-slate-300">Se eliminarán esta cuenta y sus relaciones de forma irreversible. Si es docente, se borrarán también sus actividades y los resultados de TODOS los alumnos en esas actividades. Se eliminarán asistencias, asignaciones, avisos propios, invitaciones y progreso propio. No se eliminarán cursos ni materias compartidos. Usá «Dar de baja» si querés conservar el historial.</p>
                    <label className="mt-5 block text-sm text-slate-200">Escribí <strong>ELIMINAR TODO</strong> para confirmar.
                        <input value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} autoFocus
                            className="mt-2 w-full rounded-xl border border-slate-500 bg-[#0f1f33] p-3 text-white" />
                    </label>
                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                        <button type="button" onClick={() => { setPermanentId(null); setDeleteConfirmation(''); }} className="rounded-xl border border-slate-600 px-4 py-2">Cancelar</button>
                        <button type="button" disabled={deleteConfirmation !== 'ELIMINAR TODO' || deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate({ id: permanentId, mode: 'permanent', confirm: deleteConfirmation }, {
                                onSuccess: () => { setPermanentId(null); setDeleteConfirmation(''); },
                            })}
                            className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-40">Eliminar cuenta y relaciones</button>
                    </div>
                    {deleteMutation.isError && <p role="alert" className="mt-3 text-sm text-rose-300">{deleteMutation.error?.response?.data?.message || deleteMutation.error?.message}</p>}
                </div>
            </div>}
        </div>
    );
}
