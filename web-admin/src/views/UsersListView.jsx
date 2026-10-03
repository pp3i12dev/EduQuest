
import { useState } from 'react';
import { useUsersByRole, useCreateUser, useUpdateUser, useToggleUserActive, useDeleteUser } from '../hooks/useUsers';
import UserFormModal from '../components/UserFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function UsersListView({ role, title }) {
    const { data: users, isLoading } = useUsersByRole(role);
    const createMutation = useCreateUser(role);
    const updateMutation = useUpdateUser(role);
    const toggleMutation = useToggleUserActive(role);
    const deleteMutation = useDeleteUser(role);

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const openCreate = () => { setEditingUser(null); setFormOpen(true); };
    const openEdit = (u) => { setEditingUser(u); setFormOpen(true); };

    const handleSubmit = (payload) => {
        const action = payload.id ? updateMutation : createMutation;
        action.mutate(payload, { onSuccess: () => setFormOpen(false) });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{title}</h2>
                <button
                    onClick={openCreate}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium cursor-pointer"
                >
                    + Agregar
                </button>
            </div>

            {isLoading ? (
                <p className="text-slate-400">Cargando...</p>
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
                            {users?.map((u) => (
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
                                            {u.isActive ? 'Activo' : 'Inactivo'}
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
                                            {u.isActive ? 'Desactivar' : 'Activar'}
                                        </button>

                                        <button
                                            onClick={() => setDeletingId(u.id)}
                                            className="text-red-400 hover:underline text-xs cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {users?.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 text-center text-slate-500"
                                    >
                                        Sin registros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <UserFormModal
                open={formOpen}
                role={role}
                initialData={editingUser}
                onSubmit={handleSubmit}
                onClose={() => setFormOpen(false)}
                isSaving={createMutation.isPending || updateMutation.isPending}
            />

            <ConfirmDialog
                open={Boolean(deletingId)}
                title="Eliminar usuario"
                message="Esta acción no se puede deshacer. ¿Confirmás?"
                confirmLabel="Eliminar"
                onCancel={() => setDeletingId(null)}
                onConfirm={() =>
                    deleteMutation.mutate(deletingId, {
                        onSuccess: () => setDeletingId(null)
                    })
                }
            />
        </div>
    );
}

