import { useContext, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { earlyNoticeService } from '../services/earlyNotice.service';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function formatDate(value) {
    if (!value) return '—';
    const ymd = String(value).slice(0, 10);
    const [year, month, day] = ymd.split('-');
    return `${day}/${month}/${year}`;
}

const TYPE_LABELS = {
    ABSENCE: 'Ausencia', LATE_ARRIVAL: 'Llegada tarde',
    ATTENDANCE_CONFIRMED: 'Asistencia confirmada',
    VIRTUAL_SYNCHRONOUS: 'Clase virtual sincrónica',
    VIRTUAL_ASYNCHRONOUS: 'Clase virtual asincrónica',
};

async function fetchPending(token) {
    const response = await fetch(`${API_URL}/early-notices/pending-mine`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Error HTTP ${response.status}`);
    return body;
}

export default function TeacherConfirmationsView() {
    const { token } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const [rejectionId, setRejectionId] = useState(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const { data, isLoading, isError, error: loadError } = useQuery({
        queryKey: ['teacher-confirmations', token],
        queryFn: () => fetchPending(token),
        enabled: Boolean(token),
        refetchInterval: 30000,
    });

    const action = useMutation({
        mutationFn: ({ id, reject, rejectionReason }) => reject
            ? earlyNoticeService.reject(token, id, rejectionReason)
            : earlyNoticeService.confirm(token, id),
        onSuccess: async () => {
            setError(''); setRejectionId(null); setReason('');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['teacher-confirmations'] }),
                queryClient.invalidateQueries({ queryKey: ['early-notices'] }),
                queryClient.invalidateQueries({ queryKey: ['notifications'] }),
            ]);
        },
        onError: (e) => setError(e.message || 'No se pudo procesar la solicitud'),
    });

    const notices = data?.data || [];

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-4 text-slate-100 sm:p-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Confirmaciones pendientes</h1>
                <p className="text-sm text-slate-300">Revisá todas las clases afectadas antes de confirmar o rechazar. La respuesta se aplica al aviso completo.</p>
            </header>
            {error && <div role="alert" className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 text-rose-200">{error}</div>}
            {isLoading && <p>Cargando solicitudes…</p>}
            {isError && <p role="alert" className="text-rose-300">{loadError?.message}</p>}
            {!isLoading && !isError && notices.length === 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">No tenés solicitudes pendientes.</div>
            )}
            {notices.map((notice) => (
                <article key={notice.id} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/90 p-5 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">{TYPE_LABELS[notice.type] || notice.type} · Aviso #{notice.id}</h2>
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">Pendiente de confirmación</span>
                    </div>
                    <p className="text-sm text-slate-300">Del {formatDate(notice.periodStart || notice.classDate)} al {formatDate(notice.periodEnd || notice.periodStart || notice.classDate)} · {notice.classCount} clases afectadas</p>
                    <p className="text-sm text-slate-300">Creado por: {[notice.createdBy?.firstName, notice.createdBy?.lastName].filter(Boolean).join(' ') || 'Usuario institucional'}</p>
                    <p className="whitespace-pre-wrap text-sm">{notice.reason}</p>
                    <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full min-w-[580px] text-left text-sm">
                            <thead className="bg-slate-800 text-slate-200"><tr><th className="p-3">Fecha</th><th className="p-3">Horario</th><th className="p-3">Materia</th><th className="p-3">Curso</th></tr></thead>
                            <tbody>{notice.classes.map((cls) => (
                                <tr key={cls.id} className="border-t border-slate-700">
                                    <td className="p-3">{formatDate(cls.classDate)}</td>
                                    <td className="p-3">{cls.startTime}–{cls.endTime}</td>
                                    <td className="p-3">{cls.teacherSubject?.subject?.nombre || '—'}</td>
                                    <td className="p-3">{cls.teacherSubject?.course?.nombre || '—'}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    <p className="text-xs text-amber-200">Hasta que confirmes, el aviso no constituye una ausencia oficialmente confirmada.</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" disabled={action.isPending} onClick={() => {
                            if (window.confirm(`¿Confirmar el aviso #${notice.id} y sus ${notice.classCount} clases?`)) {
                                setError(''); action.mutate({ id: notice.id, reject: false });
                            }
                        }} className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50">Confirmar todas las clases</button>
                        <button type="button" disabled={action.isPending} onClick={() => { setRejectionId(notice.id); setReason(''); setError(''); }} className="cursor-pointer rounded-lg border border-rose-500 px-4 py-2 text-rose-200 hover:bg-rose-950/50 disabled:opacity-50">Rechazar aviso</button>
                        <Link className="text-sm text-blue-300 underline" to="/dashboard/early-notices">Ver avisos tempranos</Link>
                    </div>
                    {rejectionId === notice.id && (
                        <form className="space-y-3 rounded-lg border border-rose-600/40 p-4" onSubmit={(e) => {
                            e.preventDefault();
                            if (!reason.trim()) return setError('Indicá el motivo del rechazo');
                            action.mutate({ id: notice.id, reject: true, rejectionReason: reason.trim() });
                        }}>
                            <label htmlFor={`reason-${notice.id}`} className="block text-sm font-semibold">Motivo del rechazo</label>
                            <textarea id={`reason-${notice.id}`} required maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3" />
                            <div className="flex gap-2">
                                <button type="submit" disabled={action.isPending || !reason.trim()} className="cursor-pointer rounded-lg bg-rose-700 px-4 py-2 disabled:opacity-50">Confirmar rechazo</button>
                                <button type="button" onClick={() => setRejectionId(null)} className="cursor-pointer rounded-lg border border-slate-600 px-4 py-2">Cancelar</button>
                            </div>
                        </form>
                    )}
                </article>
            ))}
        </div>
    );
}
