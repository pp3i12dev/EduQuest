import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';

import api from '../api/axios';

const createEmptyOption = (id) => ({
    id,
    text: '',
    isCorrect: false,
});

const DEFAULT_OPTIONS = [
    createEmptyOption(1),
    createEmptyOption(2),
];

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;

const normalizeQuizData = (quiz) => {
    if (!quiz) {
        return {
            title: '',
            question: '',
            options: DEFAULT_OPTIONS,
        };
    }

    const content = quiz.content ?? {};
    const questions = Array.isArray(content.questions) ? content.questions : [];
    const firstQuestion = questions[0] ?? {};
    const normalizedOptions = Array.isArray(firstQuestion.options)
        ? firstQuestion.options.map((option, index) => ({
            id: `${quiz.id ?? 'quiz'}-${index}`,
            text: option?.text ?? '',
            isCorrect: Boolean(option?.isCorrect),
        }))
        : DEFAULT_OPTIONS;

    return {
        title: quiz.title ?? '',
        question: firstQuestion.text ?? '',
        options: normalizedOptions.length >= MIN_OPTIONS
            ? normalizedOptions
            : [
                ...normalizedOptions,
                ...Array.from({ length: Math.max(0, MIN_OPTIONS - normalizedOptions.length) }, (_, idx) => createEmptyOption(`${quiz.id ?? 'quiz'}-empty-${idx}`)),
            ],
    };
};

export default function QuizCreatorModal({
    isOpen,
    onClose,
    mode = 'create',
    teacherSubjectId,
    teacherId,
    activityId,
    initialQuiz,
}) {
    const [title, setTitle] = useState('');
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

    const isEditMode = mode === 'edit';

    const validation = useMemo(() => {
        const trimmedTitle = title.trim();
        const trimmedQuestion = question.trim();

        if (!trimmedTitle || !trimmedQuestion) {
            return { isValid: false, message: 'Completá el título y la pregunta.' };
        }

        if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
            return { isValid: false, message: 'Debés tener entre 2 y 4 opciones.' };
        }

        const emptyOption = options.some(option => !option.text.trim());
        if (emptyOption) {
            return { isValid: false, message: 'Ninguna opción puede quedar vacía.' };
        }

        const correctCount = options.filter(option => option.isCorrect).length;
        if (correctCount !== 1) {
            return { isValid: false, message: 'Debe haber exactamente una respuesta correcta.' };
        }

        return { isValid: true, message: '' };
    }, [title, question, options]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (initialQuiz) {
            const normalized = normalizeQuizData(initialQuiz);
            setTitle(normalized.title);
            setQuestion(normalized.question);
            setOptions(normalized.options);
            return;
        }

        if (isEditMode && activityId) {
            const loadQuiz = async () => {
                setIsLoadingQuiz(true);
                try {
                    const { data } = await api.get(`/activities/${activityId}`);
                    const normalized = normalizeQuizData(data);
                    setTitle(normalized.title);
                    setQuestion(normalized.question);
                    setOptions(normalized.options);
                } catch (requestError) {
                    const backendMessage = requestError?.response?.data?.message || 'No se pudo cargar el cuestionario.';
                    setError(backendMessage);
                } finally {
                    setIsLoadingQuiz(false);
                }
            };

            loadQuiz();
            return;
        }

        setTitle('');
        setQuestion('');
        setOptions(DEFAULT_OPTIONS);
        setError('');
        setSuccessMessage('');
    }, [isOpen, activityId, initialQuiz, isEditMode]);

    const addOption = () => {
        if (options.length >= MAX_OPTIONS) {
            return;
        }

        setOptions(prev => [
            ...prev,
            createEmptyOption(Date.now() + Math.random()),
        ]);
    };

    const removeOption = (id) => {
        if (options.length <= MIN_OPTIONS) {
            return;
        }

        setOptions(prev => {
            const updated = prev.filter(option => option.id !== id);
            const correctOptions = updated.filter(option => option.isCorrect).length;

            if (correctOptions === 0 && updated.length > 0) {
                updated[0].isCorrect = true;
            }

            return updated;
        });
    };

    const updateOptionText = (id, value) => {
        setOptions(prev => prev.map(option => (
            option.id === id
                ? { ...option, text: value }
                : option
        )));
    };

    const setCorrectOption = (id) => {
        setOptions(prev => prev.map(option => ({
            ...option,
            isCorrect: option.id === id,
        })));
    };

    const resetForm = () => {
        setTitle('');
        setQuestion('');
        setOptions(DEFAULT_OPTIONS);
        setError('');
        setSuccessMessage('');
    };

    const closeModal = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!validation.isValid) {
            setError(validation.message);
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        const payload = {
            teacherId: teacherId ?? null,
            teacherSubjectId: teacherSubjectId ?? null,
            title: title.trim(),
            activityType: 'TRIVIA',
            questions: [
                {
                    text: question.trim(),
                    options: options.map(option => ({
                        text: option.text.trim(),
                        isCorrect: Boolean(option.isCorrect),
                    })),
                },
            ],
        };

        try {
            if (isEditMode && activityId) {
                await api.put(`/activities/${activityId}`, payload);
                setSuccessMessage('Cuestionario actualizado correctamente.');
            } else {
                await api.post('/activities/quiz', payload);
                setSuccessMessage('Cuestionario creado correctamente.');
            }

            setTimeout(() => {
                closeModal();
            }, 900);
        } catch (requestError) {
            const backendMessage = requestError?.response?.data?.message
                || requestError?.message
                || 'No se pudo guardar el cuestionario.';

            setError(backendMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/80 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">
                        {isEditMode ? 'Editar cuestionario' : 'Crear cuestionario'}
                    </h2>

                    <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-xl border border-slate-600 bg-slate-800 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
                        aria-label="Cerrar formulario"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    {isLoadingQuiz ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-5 text-slate-300">
                            Cargando cuestionario...
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Título del cuestionario
                                </label>

                                <input
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    placeholder="Ej: Ecuaciones básicas"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Tipo de actividad
                                </label>

                                <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-200">
                                    Trivia
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Escribí la pregunta
                                </label>

                                <input
                                    value={question}
                                    onChange={(event) => setQuestion(event.target.value)}
                                    placeholder="¿Cuál es el resultado de 2 + 4 = 10?"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-slate-300">
                                        Opciones de respuesta
                                    </label>

                                    <button
                                        type="button"
                                        onClick={addOption}
                                        disabled={options.length >= MAX_OPTIONS}
                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Plus size={15} />
                                        Agregar opción
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {options.map((option, index) => (
                                        <div
                                            key={option.id}
                                            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3"
                                        >
                                            <input
                                                type="text"
                                                value={option.text}
                                                onChange={(event) => updateOptionText(option.id, event.target.value)}
                                                placeholder={`Opción ${index + 1}`}
                                                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                                            />

                                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                                                <input
                                                    type="radio"
                                                    checked={Boolean(option.isCorrect)}
                                                    onChange={() => setCorrectOption(option.id)}
                                                    className="h-4 w-4 accent-emerald-500"
                                                />
                                                Correcta
                                            </label>

                                            {options.length > MIN_OPTIONS && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOption(option.id)}
                                                    className="rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                                                    aria-label="Eliminar opción"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                            <div className="flex items-center gap-2">
                                <Check size={16} />
                                <span>{successMessage}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                        >
                            Volver / cerrar
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoadingQuiz || !validation.isValid || isSaving}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {isSaving ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
