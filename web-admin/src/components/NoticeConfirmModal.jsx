import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Ban, Trash2, X } from 'lucide-react';

/**
 * Confirmación compartida para operaciones sobre avisos.
 * Nunca ejecuta la acción hasta pulsar el botón de confirmación.
 */
export default function NoticeConfirmModal({
    open,
    title,
    description,
    subject,
    confirmLabel = 'Confirmar',
    tone = 'danger',
    busy = false,
    error = '',
    onConfirm,
    onCancel,
}) {
    const titleId = useId();
    const descriptionId = useId();
    const cancelButtonRef = useRef(null);
    const dialogRef = useRef(null);
    const latestRef = useRef({ busy, onCancel });
    latestRef.current = { busy, onCancel };

    useEffect(() => {
        if (!open) return undefined;

        const previousFocus = document.activeElement;
        cancelButtonRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!latestRef.current.busy) latestRef.current.onCancel?.();
                return;
            }
            if (event.key !== 'Tab') return;
            const buttons = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])];
            if (!buttons.length) {
                event.preventDefault();
                return;
            }
            if (event.shiftKey && document.activeElement === buttons[0]) {
                event.preventDefault();
                buttons[buttons.length - 1].focus();
            } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
                event.preventDefault();
                buttons[0].focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
                previousFocus.focus();
            }
        };
    }, [open]);

    if (!open) return null;

    const isWarning = tone === 'warning';
    const Icon = isWarning ? Ban : Trash2;
    const iconStyle = isWarning
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    const confirmStyle = isWarning
        ? 'bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-400'
        : 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-400';

    return createPortal(
        <div
            className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) onCancel?.();
            }}
        >
            <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="w-full max-w-lg rounded-2xl border border-slate-600/80 bg-slate-900 p-6 text-white shadow-2xl shadow-black/40 sm:p-7"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconStyle}`}>
                            <Icon size={21} aria-hidden="true" />
                        </span>
                        <div>
                            <h2 id={titleId} className="text-xl font-bold tracking-tight">{title}</h2>
                            <p className="mt-1 text-xs text-slate-400">Confirmá antes de continuar</p>
                        </div>
                    </div>
                    <button type="button" aria-label="Cerrar confirmación" disabled={busy}
                        onClick={onCancel}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50">
                        <X size={19} />
                    </button>
                </div>

                <p id={descriptionId} className="mt-5 text-sm leading-6 text-slate-200">{description}</p>
                {subject && (
                    <div className="mt-4 break-words rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm font-medium text-slate-200">
                        {subject}
                    </div>
                )}
                {error && (
                    <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                        {error}
                    </p>
                )}

                <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                    <button ref={cancelButtonRef} type="button" disabled={busy} onClick={onCancel}
                        className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" disabled={busy} onClick={onConfirm}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmStyle}`}>
                        {busy ? 'Procesando…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
