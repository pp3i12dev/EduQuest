import { useState } from 'react';
import {
    useTeacherSubjectDetail,
    useAssignableActivities,
    useSaveTeacherSubject,
} from '../hooks/useTeacherSubject';
import ConfirmDialog from './ConfirmDialog';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const splitName = (name) => {
    const index = name.lastIndexOf('.');
    return index === -1
        ? { base: name, ext: '' }
        : { base: name.slice(0, index), ext: name.slice(index) };
};
const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="w-4 h-4">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
);
export default function EditSubjectModal({ teacherSubjectId, onClose }) {
    if (!teacherSubjectId) return null;
    return <EditSubjectForm key={teacherSubjectId} teacherSubjectId={teacherSubjectId} onClose={onClose} />;
}
function EditSubjectForm({ teacherSubjectId, onClose }) {
    const { data, isLoading, isError } = useTeacherSubjectDetail(teacherSubjectId);
    const { data: assignable = [] } = useAssignableActivities(teacherSubjectId);
    const saveMutation = useSaveTeacherSubject();

    const [newFiles, setNewFiles] = useState([]);
    const [deletedContentIds, setDeletedContentIds] = useState([]);
    const [renamed, setRenamed] = useState({});
    const [activityIdsToRemove, setActivityIdsToRemove] = useState([]);
    const [activitiesToAdd, setActivitiesToAdd] = useState([]);

    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [showAssign, setShowAssign] = useState(false);
    const [localError, setLocalError] = useState('');
    const [pendingAction, setPendingAction] = useState(null);
        const askDelete = (content) => setPendingAction({ type: 'content', item: content });
    const askRemoveActivity = (activity) => setPendingAction({ type: 'activity', item: activity });

    const confirmPending = () => {
        if (pendingAction?.type === 'content') markContentForDelete(pendingAction.item.id);
        if (pendingAction?.type === 'activity') removeActivity(pendingAction.item);
        setPendingAction(null);
    };
        const visibleContents = (data?.contents ?? []).filter((c) => !deletedContentIds.includes(c.id));

    const visibleActivities = [
        ...(data?.activities ?? []).filter((a) => !activityIdsToRemove.includes(a.id)),
        ...activitiesToAdd,
    ];

    const availableToAssign = assignable.filter((a) => !activitiesToAdd.some((x) => x.id === a.id));

    const hasChanges =
        newFiles.length > 0 ||
        deletedContentIds.length > 0 ||
        Object.keys(renamed).length > 0 ||
        activityIdsToRemove.length > 0 ||
        activitiesToAdd.length > 0;
            const addFiles = (event) => {
        setLocalError('');
        const valid = [];
        for (const file of Array.from(event.target.files)) {
            const { ext } = splitName(file.name);
            if (!ALLOWED_EXTENSIONS.includes(ext.toLowerCase())) {
                setLocalError(`Formato no permitido: ${file.name}. Solo PDF o Word`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                setLocalError(`${file.name} supera los 10 MB`);
                continue;
            }
            valid.push(file);
        }
        setNewFiles((current) => [...current, ...valid]);
        event.target.value = '';
    };

    const removeNewFile = (index) => {
        setNewFiles((current) => current.filter((_, i) => i !== index));
    };

    const markContentForDelete = (id) => {
        setDeletedContentIds((current) => [...current, id]);
        setRenamed((current) => {
            const next = { ...current };
            delete next[id];
            return next;
        });
    };

    const startRename = (content) => {
        setEditingId(content.id);
        setEditingText(splitName(renamed[content.id] ?? content.name).base);
    };

    const confirmRename = (content) => {
        const { ext } = splitName(content.name);
        let base = editingText.trim();
        if (ext && base.toLowerCase().endsWith(ext.toLowerCase())) {
            base = base.slice(0, -ext.length).trim();
        }
        if (base) {
            const finalName = `${base}${ext}`;
            setRenamed((current) => {
                const next = { ...current };
                if (finalName === content.name) delete next[content.id];
                else next[content.id] = finalName;
                return next;
            });
        }
        setEditingId(null);
    };

    const removeActivity = (activity) => {
        if (activitiesToAdd.some((a) => a.id === activity.id)) {
            setActivitiesToAdd((current) => current.filter((a) => a.id !== activity.id));
        } else {
            setActivityIdsToRemove((current) => [...current, activity.id]);
        }
    };

    const addActivity = (activity) => {
        setActivitiesToAdd((current) => [...current, activity]);
        setShowAssign(false);
    };
        const handleSave = () => {
        const changes = {
            deletedContentIds,
            renamedContents: Object.entries(renamed).map(([id, name]) => ({ id: Number(id), name })),
            activityIdsToAdd: activitiesToAdd.map((a) => a.id),
            activityIdsToRemove,
        };
        saveMutation.mutate(
            { id: teacherSubjectId, changes, files: newFiles },
            { onSuccess: onClose }
        );
    };
        const serverError = saveMutation.error?.response?.data?.message;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-5">
                <h3 className="text-lg font-semibold italic">Editar materia</h3>

                {isLoading && <p className="text-slate-400">Cargando...</p>}
                {isError && <p className="text-red-400">No se pudo cargar la materia.</p>}

                {data && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                                {data.subject.nombre}
                            </div>
                            <div className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
                                Curso: {data.course.nombre}
                            </div>
                        </div>

                        <section>
                            <h4 className="font-semibold mb-2">Contenidos de la materia</h4>

                            <label className="block w-full text-center bg-blue-600 hover:bg-blue-700 rounded py-2 text-sm font-medium cursor-pointer">
                                + Agregar PDF / Word
                                <input type="file" multiple accept=".pdf,.doc,.docx" onChange={addFiles} className="hidden" />
                            </label>
                            <p className="text-center text-xs text-slate-500 mt-1 mb-3">Formatos permitidos: PDF, Word</p>

                            {visibleContents.map((content) => (
                                <div key={content.id}
                                    className="flex justify-between items-center gap-2 bg-slate-800/60 border border-slate-700 rounded px-3 py-2 mb-2 text-sm">
                                    {editingId === content.id ? (
                                        <input autoFocus value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') confirmRename(content);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1" />
                                    ) : (
                                        <span className="flex-1 truncate">{renamed[content.id] ?? content.name}</span>
                                    )}
                                    <span className="text-slate-400 text-xs">{formatSize(content.sizeBytes)}</span>
                                    {editingId === content.id ? (
                                        <button onClick={() => confirmRename(content)} className="text-emerald-400 text-xs">OK</button>
                                    ) : (
                                      <button onClick={() => startRename(content)} title="Editar nombre" aria-label="Editar nombre"
                                        className="border border-blue-500 text-blue-400 hover:bg-blue-500/10 rounded p-1.5">
                                        <PencilIcon />
                                      </button>
                                    )}
                                    <button onClick={() => askDelete(content)}
                                        className="border border-red-500 text-red-400 rounded px-2 py-1 text-xs">
                                        Eliminar
                                    </button>
                                </div>
                            ))}

                            {newFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`}
                                    className="flex justify-between items-center gap-2 bg-blue-950/40 border border-blue-800 rounded px-3 py-2 mb-2 text-sm">
                                    <span className="flex-1 truncate">{file.name} <em className="text-blue-300 text-xs">(nuevo)</em></span>
                                    <span className="text-slate-400 text-xs">{formatSize(file.size)}</span>
                                    <button onClick={() => removeNewFile(index)}
                                        className="border border-red-500 text-red-400 rounded px-2 py-1 text-xs">
                                        Quitar
                                    </button>
                                </div>
                            ))}

                            {visibleContents.length === 0 && newFiles.length === 0 && (
                                <p className="text-slate-500 text-sm">Todavía no hay contenidos.</p>
                            )}
                        </section>

                        <section>
                            <h4 className="font-semibold mb-2">Juegos asignados</h4>

                            {visibleActivities.map((activity) => (
                                <div key={activity.id}
                                    className="flex justify-between items-center gap-2 bg-slate-800/60 border border-slate-700 rounded px-3 py-2 mb-2 text-sm">
                                    <span className="flex-1">{activity.title}</span>
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        En funcionamiento
                                    </span>
                                    <button onClick={() => askRemoveActivity(activity)}
                                        className="border border-red-500 text-red-400 rounded px-2 py-1 text-xs">
                                        Quitar
</                                  button>
                                </div>
                            ))}
                            {visibleActivities.length === 0 && (
                                <p className="text-slate-500 text-sm">No hay juegos asignados.</p>
                            )}

                            <button onClick={() => setShowAssign((v) => !v)}
                                className="mt-2 bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 text-sm">
                                + Asignar nuevo juego
                            </button>

                            {showAssign && (
                                <div className="mt-3 border border-slate-700 rounded p-3 space-y-2">
                                    {availableToAssign.length === 0 && (
                                        <p className="text-slate-500 text-sm">No hay juegos disponibles para asignar.</p>
                                    )}
                                    {availableToAssign.map((activity) => (
                                        <div key={activity.id} className="flex justify-between items-center text-sm">
                                            <span>{activity.title}</span>
                                            <button onClick={() => addActivity(activity)} className="text-blue-400 text-xs">
                                                Asignar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {(localError || serverError) && (
                    <p role="alert" className="text-sm text-red-400">{localError || serverError}</p>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800">
                        Volver / cerrar
                    </button>
                    <button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                        {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
                <ConfirmDialog
                open={Boolean(pendingAction)}
                title={pendingAction?.type === 'content' ? 'Eliminar contenido' : 'Quitar juego'}
                message={pendingAction?.type === 'content'
                    ? `¿Confirmás eliminar "${renamed[pendingAction.item.id] ?? pendingAction.item.name}"?`
                    : `¿Confirmás quitar "${pendingAction?.item?.title}" de la materia?`}
                confirmLabel={pendingAction?.type === 'content' ? 'Eliminar' : 'Quitar'}
                onConfirm={confirmPending}
                onCancel={() => setPendingAction(null)}
                />
        </div>
    );
}