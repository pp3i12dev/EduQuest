import { useState, useEffect } from 'react';
import { useUserRoles, useUpdateUserRoles } from '../hooks/useUsers';

const baseEmpty = {
    dni: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
};

const ROLE_EXTRA_FIELDS = {
    student: { legajoStudent: '' },
    teacher: { legajoTeacher: '', specialty: '' },
    preceptor: { legajoPreceptor: '', shift: '' },
    director: { position: '' },
};

const ROLE_REQUIRED_FIELDS = {
    student: ['legajoStudent'],
    teacher: ['legajoTeacher'],
    preceptor: ['legajoPreceptor'],
    director: [],
};

export default function UserFormModal({
    open,
    role,
    initialData,
    onSubmit,
    onClose,
    isSaving,
}) {
    const isEditing = Boolean(initialData?.id);

    const [showPassword, setShowPassword] = useState(false);

    /*
     * Roles actuales del usuario.
     * Solo se utilizan al editar un usuario.
     */
    const { data: userRoles } = useUserRoles(initialData?.id);
    const updateRolesMutation = useUpdateUserRoles();

    const [roleChecks, setRoleChecks] = useState({
        student: false,
        teacher: false,
        preceptor: false,
        director: false,
    });

    const [roleExtraData, setRoleExtraData] = useState({});

    const [form, setForm] = useState({
        ...baseEmpty,
        ...ROLE_EXTRA_FIELDS[role],
    });

    /*
     * Sincronizar los roles actuales cuando llegan desde backend.
     */
    useEffect(() => {
        if (!userRoles) return;

        setRoleChecks({
            student: Boolean(userRoles.profiles?.student),
            teacher: Boolean(userRoles.profiles?.teacher),
            preceptor: Boolean(userRoles.profiles?.preceptor),
            director: Boolean(userRoles.profiles?.director),
        });
    }, [userRoles]);

    /*
     * Inicializar / reinicializar el formulario.
     */
    useEffect(() => {
        if (!open) return;

        setShowPassword(false);
        setRoleExtraData({});

        if (initialData) {
            setForm({
                dni: initialData.dni ?? '',
                email: initialData.email ?? '',
                firstName: initialData.firstName ?? '',
                lastName: initialData.lastName ?? '',
                password: '',

                ...(role === 'student' && {
                    legajoStudent:
                        initialData.profile?.legajoStudent ?? '',
                }),

                ...(role === 'teacher' && {
                    legajoTeacher:
                        initialData.profile?.legajoTeacher ?? '',
                    specialty:
                        initialData.profile?.specialty ?? '',
                }),

                ...(role === 'preceptor' && {
                    legajoPreceptor:
                        initialData.profile?.legajoPreceptor ?? '',
                    shift:
                        initialData.profile?.shift ?? '',
                }),

                ...(role === 'director' && {
                    position:
                        initialData.profile?.position ?? '',
                }),
            });
        } else {
            setForm({
                ...baseEmpty,
                ...ROLE_EXTRA_FIELDS[role],
            });

            setRoleChecks({
                student: false,
                teacher: false,
                preceptor: false,
                director: false,
            });
        }
    }, [initialData, open, role]);

    /*
     * Cambiar un rol del usuario.
     */
    const toggleRole = (roleKey) => {
        setRoleChecks((prev) => ({
            ...prev,
            [roleKey]: !prev[roleKey],
        }));
    };

    /*
     * Guardar cambios de roles.
     */
    const handleSaveRoles = () => {
        const payload = {};

        for (const roleKey of Object.keys(ROLE_EXTRA_FIELDS)) {
            const wasEnabled = Boolean(
                userRoles?.profiles?.[roleKey]
            );

            const isEnabled = Boolean(
                roleChecks[roleKey]
            );

            if (wasEnabled === isEnabled) continue;

            payload[roleKey] = {
                enabled: isEnabled,
                ...(roleExtraData[roleKey] || {}),
            };
        }

        if (Object.keys(payload).length === 0) return;

        updateRolesMutation.mutate({
            id: initialData.id,
            roles: payload,
        });
    };

    /*
     * Cambios de los campos principales.
     */
    const handleChange = (e) => {
        setForm((current) => ({
            ...current,
            [e.target.name]: e.target.value,
        }));
    };

    /*
     * Guardar usuario.
     */
    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            ...form,
        };

        /*
         * Al editar:
         * contraseña vacía = conservar contraseña actual.
         */
        if (isEditing && !payload.password) {
            delete payload.password;
        }

        onSubmit(
            isEditing
                ? {
                    id: initialData.id,
                    ...payload,
                }
                : payload
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto py-8">

            <form
                onSubmit={handleSubmit}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4"
            >

                {/* ========================= */}
                {/* TÍTULO */}
                {/* ========================= */}

                <h3 className="text-lg font-semibold">
                    {isEditing ? 'Editar' : 'Nuevo'} {role}
                </h3>

                {/* ========================= */}
                {/* NOMBRE Y APELLIDO */}
                {/* ========================= */}

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

                {/* ========================= */}
                {/* DNI */}
                {/* ========================= */}

                <input
                    name="dni"
                    value={form.dni}
                    onChange={handleChange}
                    placeholder="DNI"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                />

                {/* ========================= */}
                {/* EMAIL */}
                {/* ========================= */}

                <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                />

                {/* ========================= */}
                {/* PASSWORD */}
                {/* ========================= */}

                <div className="relative">

                    <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={handleChange}
                        placeholder={
                            isEditing
                                ? 'Nueva contraseña (opcional)'
                                : 'Contraseña'
                        }
                        required={!isEditing}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 pr-10 text-sm"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setShowPassword((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        aria-label={
                            showPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                        }
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>

                </div>

                {/* ========================= */}
                {/* DATOS DEL ALUMNO */}
                {/* ========================= */}

                {role === 'student' && (
                    <div className="space-y-4">

                        <input
                            name="legajoStudent"
                            value={form.legajoStudent}
                            onChange={handleChange}
                            placeholder="Legajo"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                        />

                    </div>
                )}

                {/* ========================= */}
                {/* DATOS DEL DOCENTE */}
                {/* ========================= */}

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

                {/* ========================= */}
                {/* DATOS DEL PRECEPTOR */}
                {/* ========================= */}

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

                {/* ========================= */}
                {/* DATOS DEL DIRECTOR */}
                {/* ========================= */}

                {role === 'director' && (
                    <input
                        name="position"
                        value={form.position}
                        onChange={handleChange}
                        placeholder="Cargo"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                    />
                )}

                {/* ========================= */}
                {/* ROLES */}
                {/* ========================= */}

                {isEditing && userRoles && (
                    <div className="border-t border-slate-800 pt-4 mt-2">

                        <p className="text-sm font-semibold text-slate-300 mb-2">
                            Roles asignados
                        </p>

                        {Object.entries(ROLE_EXTRA_FIELDS).map(
                            ([roleKey]) => {

                                const wasEnabled = Boolean(
                                    userRoles.profiles?.[roleKey]
                                );

                                const isChecked =
                                    roleChecks[roleKey] ??
                                    wasEnabled;

                                const isNewlyChecked =
                                    isChecked && !wasEnabled;

                                const isBeingRemoved =
                                    !isChecked && wasEnabled;

                                return (
                                    <div
                                        key={roleKey}
                                        className="mb-2"
                                    >

                                        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">

                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() =>
                                                    toggleRole(roleKey)
                                                }
                                                className="accent-blue-600 cursor-pointer"
                                            />

                                            {roleKey}

                                            {isBeingRemoved && (
                                                <span className="text-red-400 text-xs">
                                                    (se va a quitar)
                                                </span>
                                            )}

                                        </label>

                                        {isNewlyChecked &&
                                            ROLE_REQUIRED_FIELDS[
                                                roleKey
                                            ]?.map((field) => (
                                                <input
                                                    key={field}
                                                    placeholder={field}
                                                    required
                                                    onChange={(e) =>
                                                        setRoleExtraData(
                                                            (prev) => ({
                                                                ...prev,
                                                                [roleKey]: {
                                                                    ...prev[
                                                                    roleKey
                                                                    ],
                                                                    [field]:
                                                                        e.target.value,
                                                                },
                                                            })
                                                        )
                                                    }
                                                    className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm"
                                                />
                                            ))}
                                    </div>
                                );
                            }
                        )}

                        <button
                            type="button"
                            onClick={handleSaveRoles}
                            disabled={
                                updateRolesMutation.isPending
                            }
                            className="mt-2 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {updateRolesMutation.isPending
                                ? 'Guardando roles...'
                                : 'Guardar cambios de roles'}
                        </button>

                    </div>
                )}

                {/* ========================= */}
                {/* BOTONES */}
                {/* ========================= */}

                <div className="flex justify-end gap-3 pt-2">

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSaving
                            ? 'Guardando...'
                            : 'Guardar'}
                    </button>

                </div>

            </form>

        </div>
    );
}