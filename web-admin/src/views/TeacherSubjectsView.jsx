
import { useContext, useState } from 'react';
import {
    BookOpen,
    GraduationCap,
    Gamepad2,
    Pencil,
    CheckCircle2,
    Clock3,
    AlertCircle,
    LoaderCircle,
    Layers3,
    ArrowRight,
    Plus,
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { useMyTeacherSubjects } from '../hooks/useTeacherSubject';
import EditSubjectModal from '../components/EditSubjectModal';
import QuizCreatorModal from '../components/QuizCreatorModal';

export default function TeacherSubjectsView() {
    const { user } = useContext(AuthContext);
    const {
        data: rows = [],
        isLoading,
        isError,
    } = useMyTeacherSubjects();

    const [selectedId, setSelectedId] = useState(null);
    const [selectedQuizSubjectId, setSelectedQuizSubjectId] = useState(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

    const openQuizCreator = (teacherSubjectId = null) => {
        setSelectedQuizSubjectId(teacherSubjectId ?? rows[0]?.id ?? null);
        setIsQuizModalOpen(true);
    };

    const activeCount = rows.filter(
        row => Boolean(row.activities?.[0])
    ).length;

    const pendingCount = rows.length - activeCount;

    const stats = [
        {
            label: 'Materias asignadas',
            value: rows.length,
            Icon: BookOpen,
            iconClass: 'text-blue-400',
            iconBackground: 'bg-blue-500/10',
        },
        {
            label: 'Con actividades',
            value: activeCount,
            Icon: CheckCircle2,
            iconClass: 'text-emerald-400',
            iconBackground: 'bg-emerald-500/10',
        },
        {
            label: 'Sin actividades',
            value: pendingCount,
            Icon: Clock3,
            iconClass: 'text-amber-400',
            iconBackground: 'bg-amber-500/10',
        },
    ];

    const renderEditButton = row => (
        <button
            type="button"
            onClick={() => setSelectedId(row.id)}
            title="Editar materia"
            aria-label={`Editar materia ${row.subject?.nombre || ''}`}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-300 transition-all hover:border-blue-400/60 hover:bg-blue-500/20 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
            <Pencil size={16} />
            <span>Editar</span>
        </button>
    );

    const renderQuizButton = row => (
        <button
            type="button"
            onClick={() => openQuizCreator(row.id)}
            title="Crear cuestionario"
            aria-label={`Crear cuestionario para ${row.subject?.nombre || 'la materia'}`}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200 transition-all hover:border-violet-400/60 hover:bg-violet-500/20 hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
            <Plus size={16} />
            <span>Cuestionario</span>
        </button>
    );

    return (
        <div className="mx-auto w-full max-w-7xl space-y-7 pb-10 text-slate-100">

            {/* ENCABEZADO */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-xl sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                            <BookOpen size={28} />
                        </div>

                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                                    Panel docente
                                </span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                Mis materias
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                                Consultá tus materias asignadas, revisá sus actividades y administrá su contenido.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => openQuizCreator(rows[0]?.id ?? null)}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
                        >
                            <Plus size={16} />
                            Crear cuestionario
                        </button>

                        <div className="hidden shrink-0 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4 text-slate-500 lg:flex">
                            <GraduationCap size={42} strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ESTADÍSTICAS */}
            {!isLoading && !isError && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {stats.map(stat => {
                        const Icon = stat.Icon;

                        return (
                            <div
                                key={stat.label}
                                className="flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-lg"
                            >
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBackground} ${stat.iconClass}`}>
                                    <Icon size={23} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-400 sm:text-sm">
                                        {stat.label}
                                    </p>

                                    <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CONTENEDOR PRINCIPAL */}
            <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/95 shadow-xl">

                <div className="flex flex-col gap-3 border-b border-slate-700/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                            <Layers3 size={20} className="text-blue-400" />
                            Listado de materias
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Materias y cursos vinculados a tu cuenta docente.
                        </p>
                    </div>

                    {!isLoading && !isError && (
                        <span className="inline-flex w-fit items-center rounded-full border border-slate-600/60 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
                            {rows.length} {rows.length === 1 ? 'materia' : 'materias'}
                        </span>
                    )}
                </div>

                {/* CARGANDO */}
                {isLoading && (
                    <div className="flex min-h-56 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                        <LoaderCircle
                            size={34}
                            className="animate-spin text-blue-400"
                        />

                        <div>
                            <p className="font-semibold text-slate-200">
                                Cargando materias...
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                                Estamos consultando tus asignaciones.
                            </p>
                        </div>
                    </div>
                )}

                {/* ERROR */}
                {isError && (
                    <div
                        role="alert"
                        className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
                    >
                        <div className="rounded-2xl bg-rose-500/10 p-4 text-rose-400">
                            <AlertCircle size={28} />
                        </div>

                        <p className="font-semibold text-rose-300">
                            No se pudieron cargar las materias.
                        </p>

                        <p className="max-w-md text-sm text-slate-400">
                            Verificá tu conexión o intentá nuevamente más tarde.
                        </p>
                    </div>
                )}

                {/* CONTENIDO */}
                {!isLoading && !isError && (
                    <>
                        {rows.length === 0 ? (
                            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                                <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-800 p-5 text-slate-400">
                                    <BookOpen size={35} />
                                </div>

                                <h3 className="text-lg font-semibold text-white">
                                    Todavía no tenés materias asignadas
                                </h3>

                                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                                    Cuando la institución te asigne materias, aparecerán aquí para que puedas consultarlas y administrarlas.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* TABLA DESKTOP */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700/70 bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                <th className="px-6 py-4">
                                                    Materia
                                                </th>

                                                <th className="px-6 py-4">
                                                    Curso
                                                </th>

                                                <th className="px-6 py-4">
                                                    Actividad
                                                </th>

                                                <th className="px-6 py-4">
                                                    Estado
                                                </th>

                                                <th className="px-6 py-4 text-right">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-800">
                                            {rows.map(row => {
                                                const game = row.activities?.[0];
                                                const active = Boolean(game);

                                                return (
                                                    <tr
                                                        key={row.id}
                                                        className="transition-colors hover:bg-slate-800/50"
                                                    >
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                                                    <BookOpen size={19} />
                                                                </div>

                                                                <span className="font-semibold text-slate-100">
                                                                    {row.subject?.nombre || 'Sin nombre'}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-2 text-slate-300">
                                                                <GraduationCap
                                                                    size={17}
                                                                    className="shrink-0 text-slate-500"
                                                                />

                                                                <span>
                                                                    {row.course?.nombre || 'Sin curso'}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-5">
                                                            {game ? (
                                                                <div className="flex items-center gap-2 text-slate-200">
                                                                    <Gamepad2
                                                                        size={17}
                                                                        className="shrink-0 text-violet-400"
                                                                    />

                                                                    <span>
                                                                        {game.title}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-500">
                                                                    Sin actividad
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-5">
                                                            <span
                                                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${active
                                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`h-1.5 w-1.5 rounded-full ${active
                                                                            ? 'bg-emerald-400'
                                                                            : 'bg-amber-400'
                                                                        }`}
                                                                />

                                                                {active
                                                                    ? 'Activa'
                                                                    : 'Inactiva'}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {renderQuizButton(row)}
                                                                {renderEditButton(row)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* TARJETAS MOBILE */}
                                <div className="divide-y divide-slate-800 md:hidden">
                                    {rows.map(row => {
                                        const game = row.activities?.[0];
                                        const active = Boolean(game);

                                        return (
                                            <div
                                                key={row.id}
                                                className="space-y-4 p-5"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                                        <BookOpen size={21} />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="break-words font-semibold text-white">
                                                            {row.subject?.nombre || 'Sin nombre'}
                                                        </h3>

                                                        <p className="mt-1 text-sm text-slate-400">
                                                            {row.course?.nombre || 'Sin curso'}
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${active
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                            }`}
                                                    >
                                                        {active ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </div>

                                                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                                        Actividad vinculada
                                                    </p>

                                                    <div className="flex items-center gap-2 text-sm text-slate-200">
                                                        <Gamepad2
                                                            size={17}
                                                            className="shrink-0 text-violet-400"
                                                        />

                                                        <span className="break-words">
                                                            {game?.title || 'Sin actividad'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    {renderEditButton(row)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}

                {!isLoading && !isError && rows.length > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-700/70 bg-slate-800/30 px-5 py-4 sm:px-7">
                        <p className="text-xs text-slate-400">
                            Mostrando {rows.length} {rows.length === 1 ? 'materia asignada' : 'materias asignadas'}
                        </p>

                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            Panel docente
                            <ArrowRight size={14} />
                        </span>
                    </div>
                )}
            </section>

            {/* MODAL DE EDICIÓN ORIGINAL */}
            {selectedId && (
                <EditSubjectModal
                    teacherSubjectId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onOpenQuizCreator={(subjectId) => {
                        setSelectedId(null);
                        openQuizCreator(subjectId);
                    }}
                />
            )}

            <QuizCreatorModal
                isOpen={isQuizModalOpen}
                teacherSubjectId={selectedQuizSubjectId}
                teacherId={user?.id ?? null}
                onClose={() => {
                    setIsQuizModalOpen(false);
                    setSelectedQuizSubjectId(null);
                }}
            />
        </div>
    );
}
