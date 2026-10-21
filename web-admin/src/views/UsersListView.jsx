
import { useState, useMemo, useEffect } from 'react';
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
    const { data: users, isLoading } = useUsersByRole(role);

    const createMutation = useCreateUser(role);
    const updateMutation = useUpdateUser(role);
    const toggleMutation = useToggleUserActive(role);
    const deleteMutation = useDeleteUser(role);

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Estado independiente de búsqueda para esta vista.
    const [searchTerm, setSearchTerm] = useState('');

    // Cuando cambia el rol, limpiamos la búsqueda anterior.
    useEffect(() => {
        setSearchTerm('');
    }, [role]);

    // Los usuarios ya vienen filtrados por rol desde el hook.
    const roleUsers = useMemo(() => {
        if (Array.isArray(users)) {
            return users;
        }

        return [];
    }, [users]);

    // Filtrado en tiempo real de los usuarios del rol actual.
    const filteredUsers = useMemo(() => {
        const normalizedSearch = normalizeText(searchTerm);

        if (!normalizedSearch) {
            return roleUsers;
        }

        // Permite buscar por varias palabras, por ejemplo:
        // "Juan Perez", "Perez Juan" o "Juan 12345678".
        const searchWords = normalizedSearch.split(/\s+/);

        return roleUsers.filter((user) => {
            const searchableText = getSearchableText(user);

            return searchWords.every((word) =>
                searchableText.includes(word)
            );
        });
    }, [roleUsers, searchTerm]);

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
                <h2 className="text-2xl font-bold">
                    {title}
                </h2>

                <button
                    onClick={openCreate}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium cursor-pointer"
                >
                    + Agregar
                </button>
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
                            {searchTerm.trim() ? (
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
                                            {u.isActive
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                    </td>

                                    <td className="text-right space-x-2">
                                        <button
                                            onClick={() => openEdit(u)}
                                            className="text-blue-400 hover:underline text-xs cursor-pointer"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            onClick={() =>
                                                toggleMutation.mutate({
                                                    id: u.id,
                                                    isActive: !u.isActive
                                                })
                                            }
                                            className="text-amber-400 hover:underline text-xs cursor-pointer"
                                        >
                                            {u.isActive
                                                ? 'Desactivar'
                                                : 'Activar'}
                                        </button>

                                        <button
                                            onClick={() =>
                                                setDeletingId(u.id)
                                            }
                                            className="text-red-400 hover:underline text-xs cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
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

            {/* Confirmación de eliminación */}
            <ConfirmDialog
                open={Boolean(deletingId)}
                title="Eliminar usuario"
                message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar"
                onCancel={() => setDeletingId(null)}
                onConfirm={() =>
                    deleteMutation.mutate(deletingId, {
                        onSuccess: () =>
                            setDeletingId(null)
                    })
                }
            />
        </div>
    );
}
